import React from "react";
import { connect } from "react-redux";
import { setOpponent, setLocalStorage } from "../redux/actions/getData";
import moment from "moment";
import { ethers } from "ethers";
import Cookies from "universal-cookie";
import ReactTooltip from "react-tooltip";
import Modal from "react-bootstrap/Modal";
import Axios from "axios";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Link } from "react-router-dom";

import Alert from "./Alert";

import { sync } from "../redux/actions/Socket";
import { chainExplorer, contractAddress, API } from "../constants/API";
import StorageABI from "../contracts/abi/storage.json";
import CoreABI from "../contracts/abi/core.json";
import imageBroken from "../asset/image-broken.jpg";
import avatarBroken from "../asset/avatar-broken.jpg";

const cookies = new Cookies();

class Dialog extends React.Component {
  state = {
    message: "",
    messages: [],
    pendingConfirmation: false,
    hash: "",
    files: [],
    preview: [],
    showImage: [],
    showingImage: "",
    profile: "",
    unreadCount: 0,
    unreadBlock: -1,
    finishUnreadSign: false,
  };

  componentDidMount = () => {
    this.getPicture();
    this.fetchMessage();
    this.handleRead();
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.opponent !== this.props.opponent) {
      this.getPicture();

      this.fetchMessage();

      cookies.remove("confirming");

      this.setState({
        message: "",
        pendingConfirmation: false,
        hash: "",
        files: [],
        preview: [],
        uploading: false,
        unreadCount: 0,
        unreadBlock: -1,
      });

      this.handleRead();
    }

    if (
      prevState.messages !== this.state.messages &&
      this.state.messages.length > 0
    ) {
      var element = this.refs.bubble;
      element.scrollTop = element.scrollHeight;
    }

    if (prevProps.updater !== this.props.updater) this.fetchMessage();
  }

  handleRead = () => {
    if (this.props.localStorage.unreadMessage)
      if (
        this.props.localStorage.unreadMessage[this.props.opponent.toLowerCase()]
      ) {
        const unreadJSON = this.props.localStorage.unreadMessage;
        this.setState({
          unreadBlock: unreadJSON[this.props.opponent.toLowerCase()].block,
        });
        delete unreadJSON[this.props.opponent.toLowerCase()];

        this.props.setLocalStorage("unreadMessage", unreadJSON);

        sync("unreadMessage", unreadJSON);
      }
  };

  getPicture = async () => {
    const checkPicture = new ethers.Contract(
      contractAddress,
      CoreABI,
      this.props.signer
    );

    const picture = await checkPicture.GetPicture(this.props.opponent);

    this.setState({
      profile: picture,
    });
  };

  chatInputHandler = (e) => {
    this.setState({
      message: e.target.value,
    });
  };

  sendingMessage = async (e) => {
    let mediaLink = [];
    if (this.state.files.length > 0) {
      const formData = new FormData();

      this.state.files.forEach((file) => {
        formData.append("files", file);
      });

      this.setState({
        uploading: true,
      });

      try {
        const result = await Axios.post(`${API}/multifiles`, formData);
        mediaLink = result.data.hash;
      } catch (error) {
        alert("Failed while uploading file. ERROR: " + error.message);
      }

      this.setState({
        uploading: false,
      });
    }

    if (mediaLink.length === this.state.files.length) {
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

      const setupMessage = new ethers.Contract(
        contractAddress,
        CoreABI,
        this.props.signer
      );

      if (window.ethereum) {
        this.setState({ pendingConfirmation: true });
      }

      try {
        const sendingMessage = await setupMessage.SendMessage(
          this.props.opponent,
          this.state.message,
          mediaLink
        );

        this.closeUpload();

        cookies.set("confirming", sendingMessage.hash, { path: "/" });

        this.setState({
          hash: sendingMessage.hash,
          message: "",
        });

        const checking = await provider.waitForTransaction(sendingMessage.hash);
        if (checking && checking.confirmations > 0 && window.ethereum) {
          cookies.remove("confirming");

          this.setState({
            pendingConfirmation: false,
            hash: "",
          });
        }
      } catch (e) {
        this.setState({ pendingConfirmation: false });
        alert(`ERROR: ${e}`);
      }
    }
  };

  fetchMessage = async () => {
    const checkStorage = new ethers.Contract(
      this.props.storage,
      StorageABI,
      this.props.signer
    );

    const messages = await checkStorage.Message(this.props.opponent);
    this.setState({ messages });
  };

  toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.onload = resolve;
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  fileUploadHandler = (e) => {
    for (let i = 0; i < e.target.files.length; i++) {
      this.toBase64(e.target.files[i]).then((data) => {
        this.setState({
          preview: [...this.state.preview, data.currentTarget.result],
        });
      });
    }

    this.setState({
      files: [...this.state.files, ...e.target.files],
    });
  };

  closeUpload = () => {
    if (this.state.files.length > 0 && !this.state.uploading)
      this.setState({
        files: [],
        preview: [],
      });
  };

  closeView = () => {
    if (this.state.showImage.length > 0) this.setState({ showImage: [] });
  };

  render() {
    return (
      <>
        <Modal
          show={this.state.files.length > 0}
          onHide={this.closeUpload}
          className="modal-file"
          contentClassName="rounded-circle"
          centered
        >
          <div className="image">
            <div className="image-list overflow-custom">
              {this.state.preview.map((img) => {
                return (
                  <img
                    src={img}
                    alt={this.props.address}
                    className="rounded"
                    onDragStart={(event) => event.preventDefault()}
                  />
                );
              })}
            </div>
            <div className="input-box">
              {this.state.uploading ? (
                <span>
                  Please wait until the upload is complete. <br />
                  After that, metamask confirmation pop-up will appear.
                </span>
              ) : null}
              <input
                type="text"
                value={this.state.message}
                onChange={this.chatInputHandler}
                onKeyPress={(event) =>
                  event.key === "Enter" &&
                  this.state.message.replace(/\s/g, "").length > 0
                    ? this.sendingMessage()
                    : null
                }
                placeholder="Type something here..."
                className="input-emoji"
                disabled={
                  this.state.pendingConfirmation && this.state.uploading
                    ? true
                    : false
                }
              />
            </div>
          </div>
        </Modal>

        <Modal
          show={this.state.showImage.length > 0}
          onHide={this.closeView}
          className="modal-view"
          contentClassName="rounded-circle"
          size="xl"
          centered
        >
          <div className="image">
            {this.state.showingImage > 0 ? (
              <div
                className="icon left"
                onClick={() =>
                  this.setState({ showingImage: this.state.showingImage - 1 })
                }
              >
                <i className="bi bi-chevron-left"></i>
              </div>
            ) : null}
            {this.state.showingImage !== this.state.showImage.length - 1 ? (
              <div
                className="icon right"
                onClick={() =>
                  this.setState({ showingImage: this.state.showingImage + 1 })
                }
              >
                <i className="bi bi-chevron-right"></i>
              </div>
            ) : null}
            <img
              src={this.state.showImage[this.state.showingImage]}
              alt={this.props.address}
              onError={({ currentTarget }) => {
                currentTarget.onerror = null;
                currentTarget.src = imageBroken;
              }}
              onDragStart={(event) => event.preventDefault()}
            />
          </div>
          <div className="image-list">
            {this.state.showImage.map((img, i) => {
              return (
                <div onClick={() => this.setState({ showingImage: i })}>
                  <img
                    src={img}
                    alt={this.props.address}
                    onError={({ currentTarget }) => {
                      currentTarget.onerror = null;
                      currentTarget.src = imageBroken;
                    }}
                    onDragStart={(event) => event.preventDefault()}
                  />
                </div>
              );
            })}
          </div>
        </Modal>

        <div>
          <div className="row anti-block">
            <div className="profile-box col-md-8">
              <Link to="">
                <i
                  className="bi bi-arrow-left"
                  onClick={() => {
                    this.props.setOpponent("");
                  }}
                ></i>
              </Link>
              <img
                src={this.state.profile}
                alt={this.props.opponent}
                className="rounded-circle"
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null;
                  currentTarget.src = avatarBroken;
                }}
                onDragStart={(event) => event.preventDefault()}
              />
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
                {this.props.opponent.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="bubble-box overflow-custom" ref="bubble">
            {this.state.messages.length > 0
              ? this.state.messages[0].FromAddress.toLowerCase() ===
                  this.props.opponent.toLowerCase() ||
                this.state.messages[0].ToAddress.toLowerCase() ===
                  this.props.opponent.toLowerCase()
                ? this.state.messages.map((val, i) => {
                    return (
                      <>
                        {i === 0 ? (
                          <div className="day" data-tip data-for={`day-${i}`}>
                            <p>
                              {parseInt(val.MessageTimestamp._hex, 0) >
                              parseInt(Date.now() / 1000, 0) - 86400
                                ? "Today"
                                : moment
                                    .unix(
                                      parseInt(val.MessageTimestamp._hex, 0)
                                    )
                                    .format(
                                      parseInt(val.MessageTimestamp._hex, 0) >
                                        parseInt(Date.now() / 1000, 0) - 604800
                                        ? "dddd"
                                        : "MM/DD/YYYY"
                                    )}
                            </p>
                          </div>
                        ) : moment
                            .unix(parseInt(val.MessageTimestamp._hex))
                            .format("dddd, Do MMMM YYYY") !==
                          moment
                            .unix(
                              parseInt(
                                this.state.messages[i - 1].MessageTimestamp
                                  ._hex,
                                0
                              )
                            )
                            .format("dddd, Do MMMM YYYY") ? (
                          <div className="day" data-tip data-for={`day-${i}`}>
                            <p>
                              {parseInt(val.MessageTimestamp._hex, 0) >
                              parseInt(Date.now() / 1000, 0) - 86400
                                ? "Today"
                                : moment
                                    .unix(
                                      parseInt(val.MessageTimestamp._hex, 0)
                                    )
                                    .format(
                                      parseInt(val.MessageTimestamp._hex, 0) >
                                        parseInt(Date.now() / 1000, 0) - 604800
                                        ? "dddd"
                                        : "MM/DD/YYYY"
                                    )}
                            </p>
                          </div>
                        ) : null}
                        {this.state.unreadBlock > -1 &&
                        val.BlockHeight._hex >= this.state.unreadBlock ? (
                          this.state.messages[i - 1] ? (
                            this.state.messages[i - 1].BlockHeight._hex >=
                            this.state.unreadBlock ? null : (
                              <div className="unread">
                                <span>Unread Message(s)</span>
                              </div>
                            )
                          ) : (
                            <div className="unread">
                              <span>Unread Message(s)</span>
                            </div>
                          )
                        ) : null}
                        <div
                          className={
                            val.FromAddress.toLowerCase() ===
                            this.props.opponent.toLowerCase()
                              ? "opponent"
                              : "you"
                          }
                        >
                          <div className="message">
                            {val.MediaLink.length > 0 ? (
                              <div className="image">
                                <div>
                                  {val.MediaLink.map((img, i) => {
                                    return (i <= 2 &&
                                      val.MediaLink.length > 4) ||
                                      val.MediaLink.length <= 4 ? (
                                      <img
                                        src={img}
                                        alt={this.props.opponent}
                                        className="rounded"
                                        onError={({ currentTarget }) => {
                                          currentTarget.onerror = null;
                                          currentTarget.src = imageBroken;
                                        }}
                                        onClick={() =>
                                          this.setState({
                                            showImage: val.MediaLink,
                                            showingImage: i,
                                          })
                                        }
                                        onDragStart={(event) =>
                                          event.preventDefault()
                                        }
                                      />
                                    ) : i === 3 && val.MediaLink.length > 4 ? (
                                      <div
                                        className="more-image"
                                        onClick={() =>
                                          this.setState({
                                            showImage: val.MediaLink,
                                            showingImage: i,
                                          })
                                        }
                                      >
                                        <div className="rounded">
                                          <p>+{val.MediaLink.length - 3}</p>
                                        </div>
                                        <img
                                          src={img}
                                          alt={this.props.opponent}
                                          className="rounded"
                                          onError={({ currentTarget }) => {
                                            currentTarget.onerror = null;
                                            currentTarget.src = imageBroken;
                                          }}
                                          onDragStart={(event) =>
                                            event.preventDefault()
                                          }
                                        />
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                                <p className="mx-1">{val.MessageText}</p>
                              </div>
                            ) : (
                              <div className="text">
                                <p className="mx-1">{val.MessageText}</p>
                              </div>
                            )}
                          </div>
                          <p className="time" data-tip data-for={`block-${i}`}>
                            {moment
                              .unix(parseInt(val.MessageTimestamp._hex, 0))
                              .format("HH:mm")}
                          </p>
                        </div>
                        <ReactTooltip
                          id={`block-${i}`}
                          place="left"
                          effect="solid"
                          type="light"
                          delayHide={200}
                          clickable
                        >
                          <a
                            href={`${chainExplorer}/block/${parseInt(
                              val.BlockHeight._hex
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Block #
                            {parseInt(val.BlockHeight._hex, 0).toLocaleString()}
                          </a>
                        </ReactTooltip>
                        <ReactTooltip
                          id={`day-${i}`}
                          place="top"
                          effect="solid"
                          type="light"
                        >
                          {moment
                            .unix(parseInt(val.MessageTimestamp._hex, 0))
                            .format("dddd, Do MMMM YYYY")}
                        </ReactTooltip>
                      </>
                    );
                  })
                : null
              : null}
          </div>
          <div className="row">
            <div className="input-chat col-md-8">
              <label for="image-uploader" className="bi bi-card-image"></label>
              <input
                type="text"
                value={this.state.message}
                onChange={this.chatInputHandler}
                onKeyPress={(event) =>
                  event.key === "Enter" &&
                  this.state.message.replace(/\s/g, "").length > 0
                    ? this.sendingMessage()
                    : null
                }
                placeholder="Type something here..."
                className="input-emoji"
                disabled={this.state.pendingConfirmation ? true : false}
              />
              <input
                id="image-uploader"
                type="file"
                accept="image/*"
                multiple
                onChange={this.fileUploadHandler}
              />
            </div>
          </div>
        </div>
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
    signer: state.user.signer,
    storage: state.user.storage,
    updater: state.user.updater,
    localStorage: state.user.localStorage,
  };
};

const mapDispatchToProps = {
  setOpponent,
  setLocalStorage,
};

export default connect(mapStateToProps, mapDispatchToProps)(Dialog);
