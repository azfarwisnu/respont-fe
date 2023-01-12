import React from "react";
import { connect } from "react-redux";
import {
  setOpponent,
  getOpponents,
  autoUpdater,
  setLocalStorage,
  setSocketId,
  setConnection,
} from "../redux/actions/getData";
import { ethers } from "ethers";
import Modal from "react-bootstrap/Modal";
import Axios from "axios";
import Cookies from "universal-cookie";
import ReactTooltip from "react-tooltip";
import WalletConnectProvider from "@walletconnect/web3-provider";
import QRCode from "qrcode";
import { Link } from "react-router-dom";

import { init, subscribe, sync } from "../redux/actions/Socket";
import { contractAddress, API } from "../constants/API";
import CoreABI from "../contracts/abi/core.json";
import StorageABI from "../contracts/abi/storage.json";
import avatarBroken from "../asset/avatar-broken.jpg";

import ListBox from "./List";

const cookies = new Cookies();

class Chats extends React.Component {
  state = {
    search: "",
    profile: "",
    modalUpload: false,
    file: {},
    images: {},
    uploading: false,
    x: 0,
    y: 0,
    classList: "",
    qrOpen: false,
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.search !== this.state.search) {
      if (ethers.utils.isAddress(this.state.search)) {
        this.getPicture(this.state.search).then((image) => {
          let profiles = { ...this.state.images };
          profiles[this.state.search] = image;
          this.setState({
            images: profiles,
          });
        });
      }
    }

    if (prevProps.opponents !== this.props.opponents)
      this.saveProfile(this.props.opponents);

    if (prevProps.socketId !== this.props.socketId) {
      this.QR();
    }
  }

  componentDidMount() {
    this.handleAutoUpdate();
    this.getProfile();
    this.saveProfile(this.props.opponents);
    this.QR();
    document.addEventListener("click", (e) => {
      try {
        let contextClass = document.getElementsByClassName("context-list");
        contextClass[0].classList.add("d-none");
        contextClass[0].classList.remove("d-block");

        if (!Array.from(e.target.classList).includes("settings-box")) {
          let settingsClass = document.getElementsByClassName("settings-list");
          settingsClass[0].classList.add("d-none");
          settingsClass[0].classList.remove("d-block");
        }

        if (this.state.classList) {
          let list = document.getElementsByClassName(
            `context-list-${this.state.classList}`
          );
          list[0].classList.remove("active");

          this.setState({
            classList: "",
          });
        }
      } catch (e) {}
    });
  }

  QR = () => {
    var canvas = document.getElementById("qr");
    if (this.props.socketId) {
      canvas.classList.add("d-block");
      canvas.classList.remove("d-none");
      QRCode.toCanvas(canvas, this.props.socketId, {
        width: 210,
        color: {
          dark: "#000",
          light: "#F2F1F2",
        },
      });
    } else {
      canvas.classList.add("d-none");
      canvas.classList.remove("d-block");
    }
  };

  getProfile = async () => {
    const getProfile = new ethers.Contract(
      this.props.storage,
      StorageABI,
      this.props.signer
    );

    const profile = await getProfile.GetPicture();

    this.setState({
      profile,
    });
  };

  handleUnread = (Sender) => {
    let unreadJSON;
    if (!this.props.localStorage.unreadMessage) {
      unreadJSON = {};
      unreadJSON[Sender] = {
        block: this.props.localStorage.data.block,
        markUnread: false,
      };
    } else {
      if (!this.props.localStorage.unreadMessage[Sender]) {
        unreadJSON = this.props.localStorage.unreadMessage;
        unreadJSON[Sender] = {
          block: this.props.localStorage.data.block,
          markUnread: true,
        };
      }
    }
    this.props.setLocalStorage("unreadMessage", unreadJSON);

    sync("unreadMessage", unreadJSON);
  };

  handleMark = () => {
    if (this.state.x > 0 && this.state.y > 0 && this.state.classList && this.state.classList.toLowerCase() !== this.props.opponent.toLowerCase()) {
      let unreadJSON;
      if (!this.props.localStorage.unreadMessage) {
        unreadJSON = {};
        unreadJSON[this.state.classList.toLowerCase()] = {
          block: -1,
          markUnread: true,
        };
      } else {
        if (
          this.props.localStorage.unreadMessage[
            this.state.classList.toLowerCase()
          ]
        ) {
          if (
            this.props.localStorage.unreadMessage[
              this.state.classList.toLowerCase()
            ].markUnread
          ) {
            unreadJSON = this.props.localStorage.unreadMessage;
            delete unreadJSON[this.state.classList.toLowerCase()];
          } else {
            unreadJSON = this.props.localStorage.unreadMessage;
            unreadJSON[this.state.classList.toLowerCase()] = {
              ...unreadJSON[this.state.classList],
              markUnread: true,
            };
          }
        } else {
          unreadJSON = this.props.localStorage.unreadMessage;
          unreadJSON[this.state.classList.toLowerCase()] = {
            block: -1,
            markUnread: true,
          };
        }
      }

      this.props.setLocalStorage("unreadMessage", unreadJSON);

      sync("unreadMessage", unreadJSON);
    }
  };

  handleAutoUpdate = async () => {
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

    const contract = new ethers.Contract(contractAddress, CoreABI, provider);

    contract.on("Sent", async (Sender, Receiver) => {
      if (
        Receiver.toLowerCase() === this.props.address.toLowerCase() ||
        Sender.toLowerCase() === this.props.address.toLowerCase()
      ) {
        const checkStorage = new ethers.Contract(
          this.props.storage,
          StorageABI,
          this.props.signer
        );

        const storage = await checkStorage.Opponents();

        this.props.getOpponents(storage);
      }

      if (
        Receiver.toLowerCase() === this.props.opponent.toLowerCase() ||
        Sender.toLowerCase() === this.props.opponent.toLowerCase()
      )
        this.props.autoUpdater({
          FromAddress: Sender,
          ToAddress: Receiver,
          MessageTimestamp: parseInt(Date.now() / 1000, 0),
        });

      if (
        Receiver.toLowerCase() === this.props.address.toLowerCase() &&
        Sender.toLowerCase() !== this.props.address &&
        Sender.toLowerCase() !== this.props.opponent.toLowerCase()
      )
        this.handleUnread(Sender.toLowerCase());
    });

    provider.on("block", (block) => {
      let detailData;
      if (this.props.localStorage.data) detailData = this.props.localStorage.data;
      
      detailData = { block };

      this.props.setLocalStorage("data", detailData);

      sync("data", detailData);
    });
  };

  searchInputHandler = (event) => {
    const value = event.target.value;

    this.setState({ search: value });
  };

  getPicture = (address) => {
    const checkPicture = new ethers.Contract(
      contractAddress,
      CoreABI,
      this.props.signer
    );

    const picture = checkPicture.GetPicture(address);
    let profile = picture.then((data) => {
      return data;
    });
    return profile;
  };

  saveProfile = (list) => {
    list.forEach((val) => {
      this.getPicture(val.Opponent).then((image) => {
        let profiles = { ...this.state.images };
        profiles[val.Opponent] = image;
        this.setState({
          images: profiles,
        });
      });
    });
  };

  renderList = () => {
    let search = this.state.search.toLowerCase().replace(/\s/g, "");

    if (search.length > 0 && !ethers.utils.isAddress(search)) {
      let filter = this.props.opponents.filter(
        (filterOne) =>
          filterOne.Opponent.toLowerCase().includes(search) &&
          !filterOne.blocked
      );
      if (filter.length > 0) {
        return (
          <div>
            {filter.map((val) => {
              const indexAddress = this.props.opponents.findIndex(
                (x) => x.Opponent.toLowerCase() === val.Opponent.toLowerCase()
              );
              return (
                <ListBox
                  Opponent={val.Opponent}
                  FromAddress={val.Messages.FromAddress}
                  image={
                    this.state.images[
                      this.props.opponents[indexAddress].Opponent
                    ]
                  }
                  MessageTimestamp={val.Messages.MessageTimestamp._hex}
                  MessageText={val.Messages.MessageText}
                  MediaLink={val.Messages.MediaLink.length}
                />
              );
            })}
          </div>
        );
      }
    } else if (ethers.utils.isAddress(search)) {
      const indexAddress = this.props.opponents
        .filter((filter) => !filter.blocked)
        .findIndex((x) => x.Opponent.toLowerCase() === search.toLowerCase());
      return search !== this.props.address.toLowerCase() ? (
        <ListBox
          Opponent={
            indexAddress >= 0
              ? this.props.opponents[indexAddress].Opponent
              : search
          }
          FromAddress={
            indexAddress >= 0
              ? this.props.opponents[indexAddress].Messages.FromAddress
              : null
          }
          image={
            indexAddress >= 0
              ? this.state.images[this.props.opponents[indexAddress].Opponent]
              : null
          }
          MessageTimestamp={
            indexAddress >= 0
              ? this.props.opponents[indexAddress].Messages.MessageTimestamp
                  ._hex
              : null
          }
          MessageText={
            indexAddress >= 0
              ? this.props.opponents[indexAddress].Messages.MessageText
              : null
          }
          MediaLink={
            indexAddress >= 0
              ? this.props.opponents[indexAddress].Messages.MediaLink.length
              : null
          }
        />
      ) : null;
    } else {
      return (
        <div>
          {this.props.opponents
            .filter((filter) => !filter.blocked)
            .map((val, i) => {
              return (
                <div
                  onContextMenu={(e) => this.showOption(e, val.Opponent)}
                  className={`context-list-${val.Opponent}`}
                >
                  <ListBox
                    Opponent={val.Opponent}
                    FromAddress={val.Messages.FromAddress}
                    image={this.state.images[val.Opponent]}
                    MessageTimestamp={val.Messages.MessageTimestamp._hex}
                    MessageText={val.Messages.MessageText}
                    MediaLink={val.Messages.MediaLink.length}
                  />
                </div>
              );
            })}
        </div>
      );
    }
  };

  showOption = (e, Opponent) => {
    let name = document.getElementsByClassName("context-list");
    name[0].classList.add("d-block");
    name[0].classList.remove("d-none");

    let list = document.getElementsByClassName(`context-list-${Opponent}`);
    list[0].classList.add("active");

    let x = e.clientX;
    let y = e.clientY;

    if (x + 200 > window.innerWidth) x -= 200;
    if (y + 100 > window.innerHeight) y -= 100;

    if (this.state.classList) {
      let list = document.getElementsByClassName(
        `context-list-${this.state.classList}`
      );
      list[0].classList.remove("active");
    }

    this.setState({
      x,
      y,
      classList: Opponent,
    });
  };

  showSettings = (e) => {
    let settingsClass = document.getElementsByClassName("settings-list");

    if (Array.from(settingsClass[0].classList).includes("d-none")) {
      settingsClass[0].classList.remove("d-none");
      settingsClass[0].classList.add("d-block");
    } else {
      settingsClass[0].classList.remove("d-block");
      settingsClass[0].classList.add("d-none");
    }
  };

  showQR = () => {
    this.setState({ qrOpen: true });

    init();
    subscribe();
    sync();
  };

  closeModal = () => {
    if (!this.state.uploading)
      this.setState({
        file: "",
        preview: "",
        modalUpload: false,
      });
  };

  fileUploadHandler = (e) => {
    var reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);

    reader.onloadend = function() {
      this.setState({
        preview: reader.result,
        file: e.target.files[0],
      });
    }.bind(this);
  };

  submitProfile = async () => {
    const formData = new FormData();

    formData.append("files", this.state.file);

    this.setState({
      uploading: true,
    });

    const result = await Axios.post(`${API}/multifiles`, formData);

    this.setState({
      uploading: false,
    });

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    const setupProfile = new ethers.Contract(
      this.props.storage,
      StorageABI,
      this.props.signer
    );

    const savingPicture = await setupProfile.ChangePicture(result.data.hash[0]);

    cookies.set("confirming", savingPicture.hash, { path: "/" });

    const checking = await provider.waitForTransaction(savingPicture.hash);
    if (checking && checking.confirmations > 0) {
      cookies.remove("confirming");

      this.setState({
        message: "",
        pendingConfirmation: false,
        hash: "",
        profile: result.data.hash[0],
      });
    }
  };

  render() {
    return (
      <>
        <Modal
          show={this.state.modalUpload}
          onHide={this.closeModal}
          contentClassName="rounded-circle"
          centered
        >
          <div className="modal-profile">
            <label for="image-uploader">
              <img
                className="rounded-circle d-block"
                src={
                  this.state.preview ? this.state.preview : this.state.profile
                }
                alt={this.state.address}
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null;
                  currentTarget.src = avatarBroken;
                }}
                onDragStart={(event) => event.preventDefault()}
              />
            </label>
            <input
              type="file"
              id="image-uploader"
              accept="image/*"
              onChange={this.fileUploadHandler}
            />
            <div className="d-flex">
              <button
                className="d-block rounded close"
                onClick={this.closeModal}
              >
                Cancel
              </button>
              <button
                className="d-block rounded submit"
                onClick={this.submitProfile}
              >
                Submit
              </button>
            </div>
          </div>
        </Modal>

        <div
          className="context-list rounded shadow-sm"
          style={{ top: this.state.y, left: this.state.x }}
        >
          {this.state.classList ? (
            <>
              <div onClick={this.handleMark} className="cursor-pointer">
                <i className="bi bi-envelope-paper"></i> Mark as read / unread
              </div>
              <div onClick={this.handlePin} className="cursor-pointer">
                <i className="bi bi-slash-circle-fill"></i> Block User
              </div>
            </>
          ) : null}
        </div>

        <div className="settings-list rounded shadow d-none">
          <div
            className="cursor-pointer"
            onClick={() => {
              this.setState({ modalUpload: true });
            }}
          >
            <i className="bi bi-person-bounding-box"></i> Change Photo Profile
          </div>
          <div className="cursor-pointer" onClick={this.showQR}>
            <i className="bi bi-qr-code"></i> My QR Code
          </div>
          <Link
            to={this.props.socketId ? null : "connections"}
            className={
              this.props.socketId
                ? "cursor-no-drop text-secondary"
                : "cursor-pointer text-light"
            }
          >
            <div
              className={
                this.props.socketId
                  ? "cursor-no-drop text-secondary"
                  : "cursor-pointer text-light"
              }
            >
              <i className="bi bi-qr-code-scan"></i> Scan QR Code
            </div>
          </Link>
          <Link
            to="connections"
            className={
              this.props.connection.find((e) => !e.connected)
                ? "text-warning"
                : "text-light"
            }
          >
            <div className="cursor-pointer">
              <i className="bi bi-modem"></i> All Connections{" "}
              {this.props.connection.find((e) => !e.connected) ? (
                <i className="bi bi-circle-fill text-warning"></i>
              ) : null}
            </div>
          </Link>
        </div>

        <div
          className={`qr-box qr-class rounded shadow ${
            this.state.qrOpen ? "d-block" : "d-none"
          }`}
        >
          <b className="qr-class">Open on Other Devices</b>
          <i
            className="bi bi-x-lg text-dark cursor-pointer"
            title="Close"
            onClick={() => this.setState({ qrOpen: false })}
          ></i>
          <span className="qr-class">
            Scan on your other devices for realtime data communication.
          </span>
          <div className="qr-class">
            <canvas id="qr" className="qr-class"></canvas>
          </div>
        </div>

        <div>
          <div className="row">
            <div className="section-head col-md-4 position-fixed">
              <div className="profile-box">
                {this.props.connection.find((e) => !e.connected) ? (
                  <i className="bi bi-circle-fill text-warning"></i>
                ) : null}
                <img
                  src={this.state.profile}
                  alt={this.props.address.toLowerCase()}
                  className={`rounded-circle settings-box ${
                    this.props.connection.find((e) => !e.connected)
                      ? "border-warning"
                      : null
                  }`}
                  onClick={this.showSettings}
                  onError={({ currentTarget }) => {
                    currentTarget.onerror = null;
                    currentTarget.src = avatarBroken;
                  }}
                  onDragStart={(event) => event.preventDefault()}
                />
                <div>
                  <ReactTooltip
                    id="copy-text"
                    place="bottom"
                    effect="solid"
                    type="light"
                    className={"copy-tooltip"}
                  >
                    Click to Copy
                  </ReactTooltip>
                  <p
                    className="cursor-pointer"
                    data-tip
                    data-for="copy-text"
                    onClick={(e) =>
                      navigator.clipboard.writeText(e.target.textContent)
                    }
                  >
                    {this.props.address.toLowerCase()}
                  </p>
                </div>
              </div>
              <hr />
              <div className="search-box">
                <i className="bi bi-search text-white"></i>
                <input
                  className=""
                  type="text"
                  placeholder="Search address..."
                  name="search"
                  onChange={this.searchInputHandler}
                />
              </div>
            </div>
            {this.renderList()}
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    tab: state.user.tab,
    opponent: state.user.opponent,
    opponents: state.user.opponents,
    signer: state.user.signer,
    storage: state.user.storage,
    address: state.user.address,
    localStorage: state.user.localStorage,
    socketId: state.user.socketId,
    connection: state.user.connection,
    connected: state.user.connected,
  };
};

const mapDispatchToProps = {
  setOpponent,
  getOpponents,
  autoUpdater,
  setLocalStorage,
  setSocketId,
  setConnection,
};

export default connect(mapStateToProps, mapDispatchToProps)(Chats);
