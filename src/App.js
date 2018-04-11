import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import * as firebase from "firebase";
import FB from 'fb-es5';
import { Icon, Table, Button, Input, AutoComplete, Switch } from 'antd';
// import {json2csv} from 'json-2-csv';
const json2csv = require('json2csv').parse;


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
      columnArray: [],
      singleEdit: false
    };
  }

  onChangeOrder(name, e) {
    const page = this.findPageByName(name)
    page.order = parseInt(e.target.value)
    this.setState({
      storedPage: this.state.storedPage
    })
  }

  onChangeAnnotation(id, e) {
    const page = this.findPageById(id)
    page.annotation = e.target.value
    this.setState({
      storedPage: this.state.storedPage
    })
  }

  submitAnnotation(id) {
    const page = this.findPageById(id)

    firebase.database().ref('users/' + this.state.user.user.uid + '/' + page.id).set(page).then(() => {
      alert('submitted annotation!')
      this.setupPages()
    })

  }

  submitOrder(name) {
    // for (var i = this.state.storedPage.length - 1; i >= 0; i--) {
    //   firebase.database().ref('users/' + this.state.user.user.uid + '/' + this.state.storedPage[i].id + '/order').set(1)
    // }

    const page = this.findPageByName(name)
    if (Number.isInteger(page.order)) {
      firebase.database().ref('users/' + this.state.user.user.uid + '/' + page.id).set(page).then(() => {
        alert('submitted order!')
        this.setupPages()
      })
    } else {
      alert('input not number!')
    }
  }

  findPageByName(name) {
    for (var i = this.state.storedPage.length - 1; i >= 0; i--) {
      if (this.state.storedPage[i].name === name) {
        return this.state.storedPage[i]
      }
    }
  }

  findPageById(id) {
    for (var i = this.state.storedPage.length - 1; i >= 0; i--) {
      if (this.state.storedPage[i].id === id) {
        return this.state.storedPage[i]
      }
    }
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
        dateArray.sort(function(a,b){
          // Turn your strings into dates, and then subtract them
          // to get a value that is either negative, positive, or zero.
          return new Date(a) - new Date(b);
        });
        let columnArray = [{
          title: 'name',
          dataIndex: 'name',
          key: 'name',
          width: 300,
          render: (name) => <span><a onClick={this.remove.bind(this, name)}><Icon type="close" /></a>&nbsp;&nbsp;{name}</span>
        }, {
          title: 'order edit',
          dataIndex: 'name',
          key: 'name' + 'order',
          width: 150,
          render: (name) => <span className='order'><Input type='text' onChange={this.onChangeOrder.bind(this, name)}/>{this.state.singleEdit && <Button onClick={this.submitOrder.bind(this, name)}>submit</Button>}</span>
        }, {
          title: 'order',
          dataIndex: 'order',
          key: Math.floor(Math.random() * 2000) + 'order',
          width: 150,
          // render: (name) => <span className='order'><Input type='text' onChange={this.onChangeOrder.bind(this, name)}/><Button onClick={this.submitOrder.bind(this, name)}>submit</Button></span>
        }, {
          title: 'annotation edit',
          dataIndex: 'id',
          key: 'id' + 'annotation',
          width: 150,
          render: (id) => <span className='annotation'><Input type='text' onChange={this.onChangeAnnotation.bind(this, id)}/>{this.state.singleEdit && <Button onClick={this.submitAnnotation.bind(this, id)}>submit</Button>}</span>
        }, {
          title: 'annotation',
          dataIndex: 'annotation',
          key: Math.floor(Math.random() * 2000) + 'annotation',
          width: 150,
          // render: (name) => <span className='order'><Input type='text' onChange={this.onChangeOrder.bind(this, name)}/><Button onClick={this.submitOrder.bind(this, name)}>submit</Button></span>
        }]

        // for (var i = dateArray.length - 1; i >= 0; i--) {
        //   columnArray.push({
        //     title: dateArray[i],
        //     dataIndex: dateArray[i],
        //     key: dateArray[i],
        //     width: 150
        //   })
        // }
        for (var i = dateArray.length - 1; i >= dateArray.length - 11; i--) {
          if (dateArray[i]) {
            columnArray.push({
              title: dateArray[i],
              dataIndex: dateArray[i],
              key: dateArray[i],
              width: 150
            })
          }
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

        storedPageArray.sort(function(a,b) {return (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0);} ); 

        this.setState({
          storedPage: storedPageArray,
          columnArray: columnArray
        }, () => {
        })
      }
    } catch (e) {
      console.log(e)
      // firebase.auth().signInWithPopup(provider).then((result) => {

      //   // This gives you a Facebook Access Token. You can use it to access the Facebook API.
      //   const token = result.credential.accessToken;

      //   localStorage.setItem('user', JSON.stringify(result));

      //   // The signed-in user info.
      //   const user = result.user;
      //   // ...
      //   FB.setAccessToken(token);
      //   this.setState({
      //     user: user
      //   }, () => this.setupPages())

      // }).catch(function(error) {
      //   console.log(error)
      //   // Handle Errors here.
      //   var errorCode = error.code;
      //   var errorMessage = error.message;
      //   // The email of the user's account used.
      //   var email = error.email;
      //   // The firebase.auth.AuthCredential type that was used.
      //   var credential = error.credential;
      //   // ...
      // });
    }
    

  }

  remove(name) {
    const page = this.findPageByName(name)

    if (page) {
      firebase.database().ref('users/' + this.state.user.user.uid).child(page.id).remove().then(() => {
        alert('removed!!')
      })
    }

  }


  componentDidMount() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser) {
      FB.setAccessToken(currentUser.credential.accessToken);
      this.setState({
        user: currentUser
      }, () => {
        firebase.database().ref('users/' + this.state.user.user.uid).on('value', (snapshot) => {
          this.setupPages()
        })
      })

    } else {

      firebase.auth().signInWithPopup(provider).then((result) => {

        // This gives you a Facebook Access Token. You can use it to access the Facebook API.
        const token = result.credential.accessToken;

        localStorage.setItem('user', JSON.stringify(result));

        FB.setAccessToken(token);
        this.setState({
          user: result
        }, () => {
          firebase.database().ref('users/' + this.state.user.user.uid).on('value', (snapshot) => {
            this.setupPages()
          })
        })

      }).catch(function(error) {
        console.log(error)
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
    // old method for search fb fan page, the api from fb has been terminated
    // if (value.length > 3) {
    //   FB.api('search?type=page&q=' + value, { fields: ['id','name', 'about', 'fan_count'] }, (res) => {
    //     if(!res || res.error) {
    //       console.log(!res ? 'error occurred' : res.error);
    //       return;
    //     }
    //     for (var i = 0; i < res.data.length; i++) {
    //       res.data[i].key = res.data[i].id
    //     }
    //     this.setState({
    //       searchResult: res.data
    //     })
    //   });
    // }

    // new method, change the search input box to a input box for user to directly input page id
    FB.api(value, {fields: ['id','name', 'about', 'fan_count']}, (res) => {
      if (!res.error) {
        res.key = res.id
        this.setState({
          searchResult: [res]
        })
      }
    })
  }

  select(value) {

    const selectedPage = this.state.searchResult.filter((result) => result.id === value)[0]
    selectedPage.name.replace(/,/g, ' ')
    selectedPage.order = 0
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
  }

  download() {
    let data, filename, link;

    let columns = ['order', 'name']

    for (var i = 4; i < this.state.columnArray.length; i++) {
      columns.push(this.state.columnArray[i].title)
    }

    const opts = { 
      fields: columns
    };
    try {
      let csv = json2csv(this.state.storedPage, opts);
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


    } catch (err) {
      console.error(err);
    }
  }

  submitAllChanges() {
    let submitObject = {}
    for (let page in this.state.storedPage) {
      submitObject[this.state.storedPage[page].id] = this.state.storedPage[page]
      
    }
    firebase.database().ref('users/' + this.state.user.user.uid).set(submitObject).then(() => {
      alert('submitted order!')
      this.setupPages()
    })
  }

  onChangeSingleEdit() {
    this.setState({
      singleEdit: !this.state.singleEdit
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
          <Button onClick={this.download.bind(this)}>Download CSV</Button>&nbsp;
          <Button onClick={this.submitAllChanges.bind(this)}>Submit All Changes</Button>&nbsp;
          <span>single edit</span>&nbsp;<Switch checked={this.state.singleEdit} onChange={this.onChangeSingleEdit.bind(this)} />
          <br /><br />

          <Table scroll={{ x: 150 * this.state.columnArray.length }} columns={this.state.columnArray} dataSource={this.state.storedPage} />
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
