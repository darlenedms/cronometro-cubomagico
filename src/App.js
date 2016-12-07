import React, { Component } from 'react';
import firebase from 'firebase';
import firebaseui from 'firebaseui';

import logo from './logo.svg';
import './App.css';
import {
  config,
  uiConfig,
} from './Config.js';

function msToISOString(ms) {
  var sec_num = parseInt(ms, 10); // don't forget the second param
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds;
}

class MyTimes extends Component {
  render() {
    if (!this.props.myTimes) {
      return null;
    }
    return (
      <fieldset>
        <legend>Meus Tempos</legend>
        <ul>
          {this.props.myTimes.map(myTime => (
            <li key={myTime.key}>{myTime.date} - {msToISOString(myTime.time)}</li>
          ))}
        </ul>
      </fieldset>
    )
  }
}

class BestTimes extends Component {
  render() {
    if (!this.props.times) {
      return null;
    }
    return (
      <fieldset>
        <legend>Melhores Tempos</legend>
        <ul>
          {this.props.times.map(time => (
            <li key={time.key}>{time.date} - {time.displayName} - {msToISOString(time.time)}</li>
          ))}
        </ul>
      </fieldset>
    )
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.startStopwatch = this.startStopwatch.bind(this);
    this.stopStopwatch = this.stopStopwatch.bind(this);
    this.saveStopwatchTime = this.saveStopwatchTime.bind(this);
    this.state = {secondsElapsed: 0};
  }
  componentDidMount() {
    this.twiceKeys = {
      first: false,
      second: false,
      stop: false,
    };
    document.onkeydown = (evt) =>  {
      if (!evt) evt = event;
      console.info(evt.name, evt.code,evt.timeStamp);
      if (evt.ctrlKey) {
        if (!this.twiceKeys.first) {
          this.twiceKeys.first = true;
        } else if (this.twiceKeys.first) {
          this.twiceKeys.second = true;
        }
        if (this.twiceKeys.first && this.twiceKeys.second) {
          if (this.twiceKeys.stop) {
            this.stopStopwatch();
            this.twiceKeys.stop = false;
          } else {
            this.startStopwatch();
            this.twiceKeys.stop = true;
          }
          this.twiceKeys.first = false;
          this.twiceKeys.second = false;
        }
        console.info('Tecla control');
      }
    };
    firebase.initializeApp(config);

    const uiConfig = {
      signInSuccessUrl: 'https://cronometro-cubomagico.firebaseapp.com/',
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID
      ],
      tosUrl: 'https://cronometro-cubomagico.firebaseapp.com/'
    };
    const ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', uiConfig);

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // User is signed in.
        var displayName = user.displayName;
        var email = user.email;
        this.setState({
          email,
          displayName,
        });
        this.loadMyTimes();
        this.loadTimes();
      } else {
        // User is signed out.
        document.getElementById('sign-in-status').textContent = 'Signed out';
        document.getElementById('sign-in').textContent = 'Sign in';
        document.getElementById('account-details').textContent = 'null';
      }
    });
  }

  tick() {
    this.setState((prevState) => ({
      secondsElapsed: prevState.secondsElapsed + 1
    }));
  }

  startStopwatch() {
    this.setState({ secondsElapsed: 0});
    this.interval = setInterval(() => this.tick(), 1000);
  }

  stopStopwatch() {
    clearInterval(this.interval);
  }

  userKey() {
    return this.state.email
      .split('@').join('_')
      .split('.').join('_');
  }

  saveStopwatchTime() {
    const email = this.state.email;
    const displayName = this.state.displayName;
    const time = this.state.secondsElapsed;
    const date = new Date();

    const newMyTimeKey = firebase.database().ref(`users/${this.userKey()}`).child('times').push().key;
    let myUpdate = {}
    myUpdate['/times/' + newMyTimeKey] = {
      time,
      date,
    };
    firebase.database().ref(`users/${this.userKey()}`).update(myUpdate);

    let updates = {};
    const newTimeKey = firebase.database().ref().child('times').push().key;
    updates['/times/' + newTimeKey] = {
      displayName,
      time,
      date,
    };
    firebase.database().ref().update(updates);
  }

  loadMyTimes() {
    const ref = firebase.database().ref(`users/${this.userKey()}`).child('times');
    ref.on('value', (value) => {
      let arr = [];
      const obj = value.val();
      for (const key in obj) {
        let newObj = obj[key];
        newObj.key = key;
        arr.push(newObj);
      }
      this.setState({
        myTimes: arr,
      });
    });
  }

  loadTimes() {
    const ref = firebase.database().ref().child('times');
    ref.on('value', (value) => {
      let arr = [];
      const obj = value.val();
      for (const key in obj) {
        let newObj = obj[key];
        newObj.key = key;
        arr.push(newObj);
      }
      this.setState({
        times: arr,
      });
    });
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Cronômetro de Cubo Mágico</h2>
        </div>
        <p className="App-intro">
          Armazene e melhore seu tempo!
        </p>
        <div id="firebaseui-auth-container"></div>
        <div id="sign-in-status"></div>
        <div id="sign-in"></div>
        <div id="account-details"></div>
        <p> Inicie e pare o cronômetro teclando os dois Controls</p>
        <div id='stopwatch-display'>{msToISOString(this.state.secondsElapsed)}</div>
        <button id="stopwatch-start" onClick={this.startStopwatch}>Iniciar</button>
        <button id="stopwatch-stop" onClick={this.stopStopwatch}>Parar</button>
        <button id="stopwatch-saveTime" onClick={this.saveStopwatchTime}>Salvar Tempo</button>

        <MyTimes myTimes={this.state.myTimes} />
        <BestTimes times={this.state.times} />

        <h2>Links</h2>
        <a href="fridrich">http://www.ws.binghamton.edu/fridrich/cube.html</a>

      </div>
    );
  }
}

export default App;
