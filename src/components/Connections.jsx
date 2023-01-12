import React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import UAParser from "ua-parser-js";
import { QrReader } from "react-qr-reader";

import { init, subscribe, accept, reject, sync } from "../redux/actions/Socket";

let userAgent = new UAParser();

class Connections extends React.Component {
  componentDidMount() {
    this.showQR();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.socketId !== this.props.socketId) {
      this.showQR();
    }

    if (
      (this.props.room &&
        this.props.socketId &&
        this.props.room !== this.props.socketId) ||
      this.props.scanning
    ) {
      const canvasClass = document.getElementsByClassName("qr");

      canvasClass[0].classList.add("d-none");
      canvasClass[0].classList.remove("d-block");
    }
  }

  showQR = () => {
    const canvasClass = document.getElementsByClassName("qr");
    var canvas = document.getElementById("qr");
    if (this.props.socketId && !this.props.room) {
      canvasClass[0].classList.add("d-block");
      canvasClass[0].classList.remove("d-none");
      QRCode.toCanvas(canvas, this.props.socketId, {
        width: 206,
        color: {
          dark: "#000",
          light: "#F2F1F2",
        },
      });
    } else {
      canvasClass[0].classList.add("d-none");
      canvasClass[0].classList.remove("d-block");
    }
  };

  scanQR = (result) => {
    if (!result) return false;

    console.log(result);
  };

  scanError = (e) => {
    console.log(e);
  };

  render() {
    return (
      <>
        <div className="connections-list">
          <div className="row">
            <div className="section-head col-md-4 connections-head text-light position-fixed">
              <Link to="">
                <i className="bi bi-arrow-left text-light"></i>
              </Link>
              <p>All Connections</p>
              <hr />
            </div>
          </div>

          <button
            className="show w-100"
            onClick={() => {
              init();
              subscribe();
              sync();
            }}
            disabled={
              (this.props.room &&
                this.props.socketId &&
                this.props.room !== this.props.socketId) ||
              this.props.scanning
                ? true
                : false
            }
          >
            <i className="bi bi-qr-code"></i> My QR
          </button>
          {!this.props.connected ? (
            <div>
              <QrReader
                scanDelay={500}
                onResult={(result) => {
                  if (result) {
                    init();
                    subscribe(result.text);
                    sync();
                  }
                }}
              />
            </div>
          ) : null}
          <div className="qr d-none">
            <canvas id="qr" className="qr-class"></canvas>
          </div>

          <div className="mt-3">
            {this.props.socketId ? (
              <div className="connection text-light">
                <div className="detail-box">
                  <div className="icon">
                    <i className="bi bi-person"></i>
                  </div>
                  <div className="detail">
                    <span>{this.props.socketId}</span>
                    <span className="user-agent">
                      {userAgent.getBrowser().name}, {userAgent.getOS().name}{" "}
                      {userAgent.getOS().version}
                      <i className="bi bi-circle-fill"></i> Current
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
            {this.props.connection.map((conn) => {
              const UA = new UAParser(conn.userAgent);

              return (
                <div className="connection text-light">
                  <div className="detail-box">
                    <div className="icon">
                      <i className="bi bi-qr-code-scan"></i>
                    </div>
                    <div className="detail">
                      <span>{conn.socketId}</span>
                      <span className="user-agent">
                        {UA.getBrowser().name}, {UA.getOS().name}{" "}
                        {UA.getOS().version}{" "}
                        <i className="bi bi-circle-fill"></i> {conn.ipAddress}
                      </span>
                    </div>
                  </div>
                  {!conn.connected ? (
                    <>
                      <button
                        className="bg-success"
                        onClick={() => accept(conn.socketId)}
                      >
                        <i className="bi bi-check2"></i>Accept
                      </button>
                      <button
                        className="bg-danger"
                        onClick={() => reject(conn.socketId)}
                      >
                        <i className="bi bi-x-lg"></i>Reject
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    connection: state.user.connection,
    connected: state.user.connected,
    socketId: state.user.socketId,
    room: state.user.room,
    scanning: state.user.scanning,
  };
};

export default connect(mapStateToProps)(Connections);
