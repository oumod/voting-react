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



import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import "./App.css";





class Whitelist extends Component {
    
  //Mettre tout les states de l'app en généralz
  state = { web3: null, accounts: null, contract: null , isOwner: false, whitelistArray: null, contractWorkflowStatus: null};
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
       this.state.contractOwner  = await contract.methods.owner().call();

      if(this.state.contractOwner === accounts[0]){
        this.setState({ isOwner: true});
      }
      

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract, whitelistArray, contractWorkflowStatus});
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






  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    if (!this.state.isOwner) {
        return <div>Acces denied, you are not the owner</div>;
    }

    return (
      <div className="App">
       
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

   

        
    

        
      </div>
    );
  }
}

export default Whitelist;