import React, { Component } from "react";
//ALL MATERIAL UI
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import StarIcon from '@material-ui/icons/StarBorder';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';

//import Whitelist from "./Whitelist"

import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import "./App.css";





class App extends Component {
  //Mettre tout les states de l'app en généralz
  state = { web3: null, accounts: null, contract: null , isOwner: false, whitelistArray: null, accountBalance: 0, contractWorkflowStatus: null};
  //Sortir certaines var du state et faire des var global?

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      const contract = new web3.eth.Contract(
        VotingContract.abi,
        deployedNetwork && deployedNetwork.address,
      );  


      const contractWorkflowStatus = await contract.methods.getWorkflowStatus().call();

      let whitelistArray = await contract.methods.getWhitelist().call();
      let accountBalance = await web3.eth.getBalance(accounts[0]);
       this.state.contractOwner  = await contract.methods.owner().call();

      if(this.state.contractOwner === accounts[0]){
        this.setState({ isOwner: true});
      }
      

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract, whitelistArray, accountBalance, contractWorkflowStatus});
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  

  whitelist = async() => {
    const { accounts, contract, web3 } = this.state;
    const addressWhitelist = this.addressWhitelist.value;
    let context = this;
    // Interaction avec le smart contract pour ajouter un compte 
    await contract.methods.register(addressWhitelist).send({from: accounts[0], gasPrice: 100000 },async function(erreur,tx){
      if(tx){
        console.log("transaction détails : ",tx);
        await web3.eth.getTransactionReceipt(tx, async function(erreur, receipt){
          console.log("receipt logs :",receipt.logs);
          
          if(receipt.status){
            let response = await contract.methods.getWhitelist().call();
            context.setState({ whitelistArray: response });
            context.addressWhitelist.value = "";

            let events = contract.events.allEvents();
            console.log(events);
          }
        })
      }
    });
    // Récupérer la liste des comptes autorisés
    //this.runInit();
  };


 /*owner = async() => {
    const {  contract } = this.state;
    
    const owner = await contract.methods.owner().call();
    console.log('owner', owner);
    this.state.contractOwner = owner;

  };*/

  




  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
         <AppBar position="static" color="default" elevation={2} >
            <Toolbar >
              <Typography variant="h6" color="inherit" noWrap >
                Voting
              </Typography>
            </Toolbar>
          </AppBar>

          <Container maxWidth="sm" component="main">
            <Grid container spacing={3} alignItems="center">

              <Grid item  sm={12}>
                <div  color="textPrimary" href="#" >
                  Contract workflow status is : {this.state.contractWorkflowStatus}
                </div>
                <div  color="textPrimary" href="#" >
                  The owner contract account is: {this.state.contractOwner}
                </div>
              </Grid>



              <Grid item  sm={12}>
                <div color="textPrimary" href="#" >
                  My account is : {this.state.accounts}, so I'm {!this.state.isOwner ? <span>not</span> : <span></span>} the owner
                </div>
                <div  color="textPrimary" href="#" >
                  My account balance is : {this.state.accountBalance} wei
                </div>
              </Grid>


              {this.state.isOwner ?  

                <Grid item sm={12}>
                  <form>
                    <label>
                      Address to store in whitelist:
                      <input type="text" id="addressWhitelist" 
                        ref={(input) => { 
                          this.addressWhitelist = input
                        }}
                      />
                    </label>
                    <input type="button" value="Set" onClick= { this.whitelist } />
                    <div>The whitelist is: 
                    {this.state.whitelistArray.map((adr) => (
                      <div key={adr}>{adr.Address}</div> 
                    ))}
                    </div>
                  </form>
                </Grid>

              : <div>Access denied for whitelist</div>}

            </Grid>
          </Container>

  


        
    

        
      </div>
      
    );
  }
}

export default App;