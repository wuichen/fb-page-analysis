import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import * as firebase from "firebase";
import FB from 'fb-es5';
import { Icon, Table, Button, Input, AutoComplete } from 'antd';
import {json2csv} from 'json-2-csv';

const Option = AutoComplete.Option;

FB.options({
  version: 'v2.11',
  appId: '183863815555068',
  appSecret: '37958f89764130c672d9194d33b0dfa5'
});
const config = {
  apiKey: "AIzaSyDo1_1fwUK0J8GsR25NfmovdRQShTKBG80",
  authDomain: "fb-page-analysis.firebaseapp.com",
  databaseURL: "https://fb-page-analysis.firebaseio.com",
  projectId: "fb-page-analysis",
  storageBucket: "fb-page-analysis.appspot.com",
  messagingSenderId: "859137007256"
};
firebase.initializeApp(config);
const provider = new firebase.auth.FacebookAuthProvider();
const rootRef = firebase.database().ref();

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      user: null,
      searchResult: [],
      storedPage: [],
      columnArray: []
    };
  }

  async setupPages() {
    try {
      const pageConnection = await firebase.database().ref('users/' + this.state.user.user.uid).once('value')
      const pagesObject = pageConnection.val()
      const dateObjects = {}
      let dateArray =[]
      if (pagesObject) {
        const pages = []
        Object.keys(pagesObject).map(function(key, index) {
           pages.push(pagesObject[key])
        });


        let processFB = (page) => {
            return new Promise(resolve => {
              FB.api(page.id, {fields: ['fan_count']}, (res) => {
                if(!res || res.error) {
                  console.log(!res ? 'error occurred' : res.error);
                  firebase.database().ref('users/' + this.state.user.user.uid + '/' + page.id + '/likeHistory/' + new Date().toLocaleDateString().replace(/\//g, '-')).set(0)
                  firebase.database.ref('error').push({
                    user: this.state.user,
                    page: page,
                    date: new Date().toLocaleDateString().replace(/\//g, '-')
                  })
                  return;
                }
                const todaysCount = res.fan_count

                // insert count and date to likehistory
                firebase.database().ref('users/' + this.state.user.user.uid + '/' + page.id + '/likeHistory/' + new Date().toLocaleDateString().replace(/\//g, '-')).set(todaysCount, () => {
                  // get likehistory
                  firebase.database().ref('users/' + this.state.user.user.uid + '/' + page.id + '/likeHistory').once('value', (snapshot) => {
                    for (const pageDate in snapshot.val()) {
                      dateArray.push(pageDate)
                      dateObjects[pageDate] = 0;
                    }
                    resolve()
                  })
                })

              })
            });
        };
        // map over forEach since it returns

        let actions = pages.map(processFB); // run the function over all items

        // we now have a promises array and we want to wait for it

        await Promise.all(actions); // pass array of promises
        
        // make array unique
        dateArray = [ ...new Set(dateArray) ]
        let columnArray = [{
          title: 'name',
          dataIndex: 'name',
          key: 'name'
        }]
        dateArray.sort().reverse()
        for (var i = dateArray.length - 1; i >= 0; i--) {
          columnArray.push({
            title: dateArray[i],
            dataIndex: dateArray[i],
            key: dateArray[i]
          })
        }

        const processedPageConnection = await firebase.database().ref('users/' + this.state.user.user.uid).once('value')
        const processedPageObject = processedPageConnection.val()

        const storedPageArray = []
        for (let processedPage in processedPageObject) {
          const page = processedPageObject[processedPage]
          const likeHistory = page.likeHistory

          for (let history in likeHistory) {
            page[history] = likeHistory[history]
          }
          storedPageArray.push(page)
        }
        this.setState({
          storedPage: storedPageArray,
          columnArray: columnArray
        }, () => {
          console.log(this.state)
        })
      }
    } catch (e) {
      console.log(e)
      firebase.auth().signInWithPopup(provider).then((result) => {

        // This gives you a Facebook Access Token. You can use it to access the Facebook API.
        const token = result.credential.accessToken;

        localStorage.setItem('user', JSON.stringify(result));

        // The signed-in user info.
        const user = result.user;
        // ...
        FB.setAccessToken(token);
        this.setState({
          user: user
        }, () => this.setupPages())

      }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
      });
    }
    

  }


  componentDidMount() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser) {
      FB.setAccessToken(currentUser.credential.accessToken);
      this.setState({
        user: currentUser
      }, () => this.setupPages())

    } else {

      firebase.auth().signInWithPopup(provider).then((result) => {

        // This gives you a Facebook Access Token. You can use it to access the Facebook API.
        const token = result.credential.accessToken;

        localStorage.setItem('user', JSON.stringify(result));

        FB.setAccessToken(token);
        this.setState({
          user: result
        }, () => this.setupPages())

      }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
      });
    }
  }

  search(value) {
    if (value.length > 3) {
      FB.api('search?type=page&q=' + value, { fields: ['id','name', 'about', 'fan_count'] }, (res) => {
        if(!res || res.error) {
          console.log(!res ? 'error occurred' : res.error);
          return;
        }
        for (var i = 0; i < res.data.length; i++) {
          res.data[i].key = res.data[i].id
        }
        console.log(res.data)
        this.setState({
          searchResult: res.data
        })
      });
    }
  }

  select(value) {

    const selectedPage = this.state.searchResult.filter((result) => result.id === value)[0]
    selectedPage.likeHistory = {}
    selectedPage.likeHistory[new Date().toLocaleDateString().replace(/\//g,'-')] = selectedPage.fan_count;

    // need to check if user and page exists, if not, create
    firebase.database().ref('users/' + this.state.user.user.uid + '/' + selectedPage.id).once('value').then((snapshot) => {
      if (!snapshot.val()) {
        firebase.database().ref('users/' + this.state.user.user.uid + '/' + selectedPage.id).set(selectedPage)
      } else {
        alert('Page exists!')
      }
      this.setupPages()
    });


    // this.setState({
    //   storedPage: this.state.storedPage.concat(this.state.searchResult.filter((result) => result.id === value))
    // })
  }

  download() {
    let data, filename, link;
    let exportJson = this.state.storedPage.slice(0);
    for (var i = exportJson.length - 1; i >= 0; i--) {
      delete exportJson[i].about;
      delete exportJson[i].id
      delete exportJson[i].key
      delete exportJson[i].likeHistory
      delete exportJson[i].fan_count
    }
    json2csv(this.state.storedPage, (err, csv) => {
      if (csv == null) return;

      filename = 'export.csv';

      if (!csv.match(/^data:text\/csv/i)) {
          csv = 'data:text/csv;charset=utf-8,' + csv;
      }
      data = encodeURI(csv);

      link = document.createElement('a');
      link.setAttribute('href', data);
      link.setAttribute('download', filename);
      link.click();
    }, {
      checkSchemaDifferences: false
    })
  }

  render() {
    return (
      <div className='App'>
        <h1 className='title'>
          Facebook page analysis
        </h1>
        <AutoComplete
          size="large"
          style={{ width: '70%' }}
          dataSource={this.state.searchResult.map(renderOption)}
          placeholder="input here"
          optionLabelProp="text"
          onSearch={this.search.bind(this)}
          onSelect={this.select.bind(this)}
        />
        <div className='resultTable'>
          <Button onClick={this.download.bind(this)}>Download CSV</Button>
          <br /><br />
          <Table scroll={{ x: 250 * this.state.storedPage.length }} columns={this.state.columnArray} dataSource={this.state.storedPage} />
        </div>
      </div>
    );
  }
}
const columns = [{
  title: 'name',
  dataIndex: 'name',
  key: 'name'
}, {
  title: 'likes on ' + new Date().toLocaleDateString("en-US"),
  dataIndex: 'fan_count',
  key: 'fan_count',
}];

function renderOption(item) {
  return (
    <Option key={item.id}>
      <div>
      {item.name}
      </div>
      <div>
      Likes:
      {item.fan_count}
      </div>
      <div>
      About:
      {item.about}
      </div>
    </Option>
  );
}

export default App;
