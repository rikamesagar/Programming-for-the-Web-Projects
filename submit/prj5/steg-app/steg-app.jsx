//-*- mode: rjsx-mode;

'use strict';

(function() {

  /************************* Utility Functions **************************/

  /** Return url passed via ws-url query parameter to this script */
  function getWsUrl() {
    const params = (new URL(document.location)).searchParams;
    return params.get('ws-url');
  }


  /** Return contents of file (of type File) read from user's computer */
  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>  resolve(reader.result);
      reader.readAsText(file);
    });
  }



  /************************* Web Service Layer *************************/
  const DEFAULT_WS_URL = 'http://localhost:1234';

  const WS_URL = getWsUrl() || DEFAULT_WS_URL;

  class StegWs {

    constructor() {
      this.baseUrl = WS_URL;
      this.apiUrl = `${this.baseUrl}/api`;
    }

    //TODO: add wrapper methods for accessing web services.
    //Adapt from prj4-sol.


  } //StegWs

  /*************************** Hide Component **************************/

  const HIDE_GROUP = 'inputs';

  class Hide extends React.Component {

    constructor(props) {
      super(props);
      //TODO other setup for Hide
    }

    //TODO other methods for Hide

    render() {
      //TODO rendering code
      return "I'm Hide"
    }

  }

  /************************** Unhide Component *************************/

  class Unhide extends React.Component {

    constructor(props) {
      super(props);
      //TODO other setup for Unhide
    }

    //TODO other methods for Unhide

    render() {
      //TODO rendering code
      return "I'm Unhide"
    }

  }


  /*************************** Tab Component ***************************/

  function Tab(props) {
    const id = props.id;
    const tabbedId = `tabbed${props.index}`;
    const checked = (props.index === 0);
    return (
      <section className="tab">
        <input type="radio" name="tab" className="tab-control"
               id={tabbedId} checked={props.isSelected}
               onChange={() => props.select(id)}/>
        <h1 className="tab-title">
          <label htmlFor={tabbedId}>{props.label}</label>
        </h1>
        <div className="tab-content" id={props.id}>
          {props.component}
        </div>
      </section>
    );
  }

  /*************************** App Component ***************************/

  class App extends React.Component {

    constructor(props) {
      super(props);

      this.select = this.select.bind(this);
      this.isSelected = this.isSelected.bind(this);

      this.state = {
        selected: 'hide',
        hide: <Hide ws={props.ws} app={this}/>,
        unhide: <Unhide ws={props.ws} app={this}/>
      };

    }

    //top-level error reporting; produces slightly better errors
    //in chrome console.
    componentDidCatch(error, info) {
      console.error(error, info);
    }

    isSelected(v) { return v === this.state.selected; }

    /** select tab v: 'hide' or 'unhide'. */
    select(v) {
      this.setState({selected: v});
      const rand = Math.random();  //random key to force remount; not performant
      let component;
      switch (v) {
        case 'hide':
          component = <Hide ws={this.props.ws} app={this} key={rand}/>;
        break;
        case 'unhide':
          component = <Unhide ws={this.props.ws} app={this} key={rand}/>;
        break;
      }
      this.setState({ [v]: component });
    }

    render() {
      const tabs = ['hide', 'unhide'].map((k, i) => {
        const component = this.state[k];
        const label = k[0].toUpperCase() + k.substr(1);
        const isSelected = (this.state.selected === k);
        const tab = (
          <Tab component={component} key={k} id={k}
               label={label} index={i}
               select={this.select} isSelected={isSelected}/>
        );
        return tab;
      });

      return <div className="tabs">{tabs}</div>
    }

  }

  /*************************** Top-Level Code **************************/

  function main() {
    const ws = new StegWs();
    const app = <App ws={ws}/>;
    ReactDOM.render(app, document.getElementById('app'));
  }

  main();

})();
