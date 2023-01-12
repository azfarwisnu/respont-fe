import React from "react";
import moment from "moment";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

import { setOpponent, setLocalStorage } from "../redux/actions/getData";

import avatarBroken from "../asset/avatar-broken.jpg";

class List extends React.Component {
  render() {
    return (
      <Link to={this.props.Opponent}>
        <div
          className={`list-box ${
            this.props.Opponent.toLowerCase() === this.props.opponent.toLowerCase()
              ? "active"
              : null
          }`}
          onClick={() => this.props.setOpponent(this.props.Opponent)}
        >
          <img
            src={this.props.FromAddress ? this.props.image : avatarBroken}
            alt={this.props.Opponent}
            className="rounded-circle"
            onError={({ currentTarget }) => {
              currentTarget.onerror = null;
              currentTarget.src = avatarBroken;
            }}
            onDragStart={(event) => event.preventDefault()}
          />
          <div className="right">
            <div
              className={`opponent ${this.props.FromAddress ? null : "mt-3"}`}
            >
              <p
                className={`address ${
                  this.props.FromAddress ? null : "fw-bold"
                }`}
                title={this.props.Opponent}
              >
                {this.props.Opponent.toLowerCase()}
              </p>
              <p className="time text-secondary">
                {this.props.FromAddress
                  ? parseInt(this.props.MessageTimestamp, 0) >
                    parseInt(Date.now() / 1000, 0) - 86400
                    ? moment
                        .unix(parseInt(this.props.MessageTimestamp, 0))
                        .format("HH:mm")
                    : parseInt(this.props.MessageTimestamp, 0) >
                      parseInt(Date.now() / 1000, 0) - 172800
                    ? "Yesterday"
                    : moment
                        .unix(parseInt(this.props.MessageTimestamp, 0))
                        .format("MM/DD/YYYY")
                  : null}
              </p>
            </div>
            {this.props.FromAddress ? (
              <div className="preview" title={this.props.MessageText}>
                <p
                  className={
                    this.props.localStorage.unreadMessage
                      ? this.props.localStorage.unreadMessage[
                          this.props.Opponent.toLowerCase()
                        ] &&
                        (this.props.localStorage.unreadMessage[
                          this.props.Opponent.toLowerCase()
                        ].count > 0 ||
                          this.props.localStorage.unreadMessage[
                            this.props.Opponent.toLowerCase()
                          ].block >= 0 ||
                          this.props.localStorage.unreadMessage[
                            this.props.Opponent.toLowerCase()
                          ].markUnread)
                        ? "fw-bold"
                        : null
                      : null
                  }
                >
                  <b>
                    {this.props.FromAddress.toLowerCase() ===
                    this.props.address.toLowerCase()
                      ? "You:"
                      : null}
                  </b>{" "}
                  {this.props.MediaLink > 0 ? (
                    <i className="bi bi-image"></i>
                  ) : null}{" "}
                  {this.props.MessageText}
                </p>
                {this.props.localStorage.unreadMessage ? (
                  this.props.localStorage.unreadMessage[
                    this.props.Opponent.toLowerCase()
                  ] &&
                  (this.props.localStorage.unreadMessage[
                    this.props.Opponent.toLowerCase()
                  ].count > 0 ||
                    this.props.localStorage.unreadMessage[
                      this.props.Opponent.toLowerCase()
                    ].block >= 0 ||
                    this.props.localStorage.unreadMessage[
                      this.props.Opponent.toLowerCase()
                    ].markUnread) ? (
                    <span class="badge">
                      {this.props.localStorage.unreadMessage[
                        this.props.Opponent.toLowerCase()
                      ].block >= 0 ||
                      this.props.localStorage.unreadMessage[
                        this.props.Opponent.toLowerCase()
                      ].markUnread
                        ? " "
                        : this.props.localStorage.unreadMessage[
                            this.props.Opponent.toLowerCase()
                          ].count}
                    </span>
                  ) : null
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    address: state.user.address,
    localStorage: state.user.localStorage,
    opponent: state.user.opponent,
  };
};

const mapDispatchToProps = {
  setOpponent,
  setLocalStorage,
};

export default connect(mapStateToProps, mapDispatchToProps)(List);
