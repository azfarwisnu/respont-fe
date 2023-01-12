import React from "react";
import Chats from "../components/Chats";
import Dialog from "../components/Dialog";
import { ethers } from "ethers";
import undrawAuth from "../asset/undraw-auth.svg";
import Cookies from "universal-cookie";
import WalletConnectProvider from "@walletconnect/web3-provider";

import { connect } from "react-redux";
import {
  setOpponent,
  getOpponents,
  getAddress,
  getSigner,
  getStorage,
  getLocalStorage,
  setLocalStorage,
} from "../redux/actions/getData";

import Alert from "../components/Alert";
import Connections from "../components/Connections";

import {
  contractAddress,
  chainIDHex,
  chainIDInt,
  chainName,
} from "../constants/API";
import CoreABI from "../contracts/abi/core.json";
import StorageABI from "../contracts/abi/storage.json";

const cookies = new Cookies();

class HomeComponent extends React.Component {
  state = {
    connected: false,
    falseNetwork: false,
    accountAddress: "",
    hasStorage: false,
    fetchedStorage: false,
    deployingHash: "",
    storageAddress: "",
  };

  componentDidMount() {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
    this.props.getLocalStorage("unreadMessage");
    this.props.getLocalStorage("data");

    try {
      if (
        ethers.utils.isAddress(this.props.match.params.address) &&
        this.props.match.params.address !== this.props.address
      ) {
        this.props.setOpponent(this.props.match.params.address);
      } else {
        this.props.setOpponent("");
      }
    } catch (e) {
      this.props.setOpponent("");
    }
  }

  componentDidUpdate(prevProps) {
    try {
      if (prevProps.match.params !== this.props.match.params) {
        if (
          ethers.utils.isAddress(this.props.match.params.address) &&
          this.props.match.params.address !== this.props.address
        ) {
          this.props.setOpponent(this.props.match.params.address);
        } else {
          this.props.setOpponent("");
        }
      }
    } catch (e) {
      this.props.setOpponent("");
    }
  }

  handleGetStorage = async (signer) => {
    const checkStorage = new ethers.Contract(contractAddress, CoreABI, signer);
    const storage = await checkStorage.Storage();
    this.props.getStorage(storage);

    return storage;
  };

  handleFetching = async (signer) => {
    const getMessage = new ethers.Contract(
      this.state.storageAddress,
      StorageABI,
      signer
    );

    let message = await getMessage.Opponents();

    if (Array.isArray(message)) {
      if (this.props.localStorage.data) {
        if (this.props.localStorage.data.block) {
          console.log(message);
          const filterMessage = message.filter(
            (message) =>
              message.Messages.BlockHeight._hex >
                this.props.localStorage.data.block &&
              message.Messages.FromAddress !== this.props.address
          );

          let unreadJSON = {};

          if (this.props.localStorage.unreadMessage)
            unreadJSON = this.props.localStorage.unreadMessage;

          filterMessage.forEach((message) => {
            if (unreadJSON[message.Opponent]) {
              unreadJSON[message.Opponent.toLowerCase()] = {
                ...unreadJSON[message.Opponent],
                block: this.props.localStorage.data.block,
              };
            } else {
              unreadJSON[message.Opponent.toLowerCase()] = {
                count: 0,
                block: this.props.localStorage.data.block,
                markUnread: false,
              };
            }
          });

          this.props.setLocalStorage("unreadMessage", unreadJSON);
        }
      }

      this.props.getOpponents(message);
    }

    return message;
  };

  handleConnect = async () => {
    try {
      let walletConnect;
      if (!window.ethereum) {
        walletConnect = new WalletConnectProvider({
          rpc: {
            80001: "https://matic-mumbai.chainstacklabs.com",
          },
          network: "mumbai",
        });

        await walletConnect.enable();
      }

      const provider = new ethers.providers.Web3Provider(
        !window.ethereum ? walletConnect : window.ethereum,
        "any"
      );
      const account = await provider.listAccounts();
      const { chainId } = await provider.getNetwork();
      provider.on("accounts", (accounts) => {
        if (accounts[0] !== account[0]) window.location.reload();
      });

      provider.on("network", (newNetwork, oldNetwork) => {
        if (oldNetwork) window.location.reload();
      });

      if (chainId !== chainIDInt) {
        this.setState({
          falseNetwork: true,
        });

        await provider.send("wallet_switchEthereumChain", [
          { chainId: chainIDHex },
        ]);
      }

      const signer = await provider.getSigner();
      const storage = await this.handleGetStorage(signer);

      this.props.getAddress(account[0]);
      this.props.getSigner(signer);

      this.setState({
        accountAddress: account[0],
        connected: true,
      });

      if (storage !== ethers.constants.AddressZero) {
        this.setState({
          hasStorage: true,
          storageAddress: storage,
        });

        const message = await this.handleFetching(signer);

        if (Array.isArray(message)) this.setState({ fetchedStorage: true });
      }
    } catch (e) {
      this.setState({
        falseNetwork: true,
      });
    }
  };

  handleSwitchNetwork = async () => {
    let walletConnect;
    if (!window.ethereum)
      walletConnect = new WalletConnectProvider({
        rpc: {
          80001: "https://matic-mumbai.chainstacklabs.com",
        },
        network: "mumbai",
      });

    const provider = new ethers.providers.Web3Provider(
      !window.ethereum ? walletConnect : window.ethereum,
      "any"
    );
    try {
      await provider.send("wallet_switchEthereumChain", [
        { chainId: chainIDHex },
      ]);

      this.setState({
        falseNetwork: false,
      });
    } catch (e) {
      console.log(e);
    }
  };

  handleDeployStorage = async () => {
    let walletConnect;
    if (!window.ethereum)
      walletConnect = new WalletConnectProvider({
        rpc: {
          80001: "https://matic-mumbai.chainstacklabs.com",
        },
        network: "mumbai",
      });

    const provider = new ethers.providers.Web3Provider(
      !window.ethereum ? walletConnect : window.ethereum,
      "any"
    );

    const signer = this.props.signer;
    try {
      const deployStorage = new ethers.Contract(
        contractAddress,
        CoreABI,
        signer
      );
      const sendingTx = await deployStorage.DeployStorage();
      cookies.set("confirming", sendingTx.hash, { path: "/" });
      this.setState({
        deployingHash: sendingTx.hash,
      });

      const checking = await provider.waitForTransaction(sendingTx.hash);
      if (checking && checking.confirmations > 0) {
        const storage = await this.handleGetStorage(signer);
        if (storage !== ethers.constants.AddressZero) {
          this.setState({
            hasStorage: true,
            storageAddress: storage,
          });

          const message = await this.handleFetching(signer);
          if (Array.isArray(message)) this.setState({ fetchedStorage: true });
        }

        cookies.remove("confirming");
      }
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    return (
      <>
        {this.state.connected &&
        this.state.hasStorage &&
        this.state.fetchedStorage ? (
          <>
            <div
              className="container-fluid"
              onKeyUp={(event) =>
                event.key === "Escape" ? this.props.setOpponent("") : null
              }
              tabIndex="0"
            >
              <div className="row">
                <div
                  className={`col-12 col-md-4 d-block left-section anti-block overflow-custom ${
                    this.props.opponent ? "mobile-section" : null
                  } ${this.props.connections ? "pt-0" : null}`}
                >
                  {this.props.connections ? <Connections /> : <Chats />}
                </div>
                <div
                  className={`col-12 col-md-8 d-block right-section ${
                    this.props.opponent ? null : "mobile-section"
                  }`}
                >
                  {this.props.opponent ? (
                    <Dialog />
                  ) : (
                    <div className="empty-box anti-block">
                      <div>
                        <span>Select a chat from left side to start.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="connect-box anti-block">
              <div className="logo">
                <p className="logo-img">RESPONT</p>
                <div className="rounded shadow-sm">
                  <h5>Connect Wallet</h5>
                  <img
                    src={undrawAuth}
                    alt="Connect Web3 Wallet"
                    onDragStart={(event) => event.preventDefault()}
                  />
                  <p>Connect to your web3 wallet to continue.</p>
                  {!this.state.falseNetwork && !this.state.connected ? (
                    <button className="rounded" onClick={this.handleConnect}>
                      Connect Wallet
                    </button>
                  ) : this.state.falseNetwork && !this.state.connected ? (
                    <>
                      <button
                        className="rounded"
                        onClick={this.handleSwitchNetwork}
                      >
                        Switch Network
                      </button>
                      <p className="text-danger">
                        Please change network to {chainName}
                      </p>
                    </>
                  ) : this.state.connected && !this.state.hasStorage ? (
                    <>
                      <button
                        className="rounded"
                        onClick={this.handleDeployStorage}
                      >
                        Deploy Storage
                      </button>
                      <p className="text-danger">
                        You need to deploy your storage.
                      </p>
                    </>
                  ) : (
                    <button
                      className="rounded"
                      onClick={this.handleConnect}
                      disabled={true}
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        {cookies.get("confirming") && window.ethereum ? (
          <Alert hash={cookies.get("confirming")} />
        ) : null}
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    tab: state.user.tab,
    opponent: state.user.opponent,
    address: state.user.address,
    signer: state.user.signer,
    localStorage: state.user.localStorage,
  };
};

const mapDispatchToProps = {
  setOpponent,
  getOpponents,
  getAddress,
  getSigner,
  getStorage,
  getLocalStorage,
  setLocalStorage,
};

export default connect(mapStateToProps, mapDispatchToProps)(HomeComponent);
