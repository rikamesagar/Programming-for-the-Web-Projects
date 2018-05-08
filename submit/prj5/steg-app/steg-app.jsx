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
    getImagesUrl = function(group) {
      return `${this.apiUrl}/images`;
    }
    
    list = async function(group) {
      try {
        const url = `${this.apiUrl}/images/${group}`;
        const response = await axios.get(url);
        return response.data;
      }
      catch (err) {
        throw (err.response.data) ? err.response.data : err;
      }
    };
    
    hide = async function(srcGroup, srcName, outGroup, msg) {
      try {
        const url = `${this.apiUrl}/steg/${srcGroup}/${srcName}`;
        const params = { outGroup: outGroup, msg: msg, };
        const response = await axios.post(url, params);
        const location = response.headers['location'];
        const match = location && location.match(/[^\/]+\/[^\/]+$/);
        if (!location || !match) {
          const err = 'cannot get hide image location';
          throw { response: { data: undefined},  message: err };
        }
        else {
          return match[0];
        }
      }
      catch (err) {
        throw (err.response.data) ? err.response.data : err;
      }  
    };

    getImage = async function(srcGroup, image){
      const url = `${this.apiUrl}/images/${srcGroup}/${image}.png`;
      const imageResult = await axios.get(url, {responseType:"arraybuffer"})
      const base64 = btoa(
        new Uint8Array(imageResult.data)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      return {name: image, data: base64}
    }
    
    unhide = async function(group, name) {
      try {
        const url = `${this.apiUrl}/steg/${group}/${name}`;
        const response = await axios.get(url);
        return response.data.msg;
      }
      catch (err) {
        throw (err.response.data) ? err.response.data : err;
      }  
    };

  } //StegWs

  /*************************** Hide Component **************************/

  const HIDE_GROUP = 'inputs';

  class Hide extends React.Component {

    constructor(props) {
      super(props);
      //TODO other setup for Hide
      this.state={images:[], selectedImage: undefined, msg:""}
      props.ws.list('inputs').then((images)=>{
        images.forEach((image, key)=>{
          props.ws.getImage('inputs', image).then((imageResult)=>{
            const newImages = this.state.images.map(i=>i)
            newImages.push(imageResult)
            this.setState({images:newImages})
          })
        })
      })
    }
    
    

    //TODO other methods for Hide

    render() {
      //TODO rendering code
      return(
        <div>
          <input type="text" onChange={(e)=> this.setState({msg:e.target.value})} value={this.state.msg} />
          <input type="file" />
          <ul>
            {this.state.images && this.state.images.map((image, key)=>{
              return (
                <li key={key}>
                  <HideOption selectImage={(imageName)=>{
                    console.log("Selected Image "+imageName)
                    this.setState({selectedImage: imageName})
                  }} base64={image.data} selectedImage={this.state.selectedImage} imageName={image.name}/>
                </li>
              )
            })}
          </ul>
          <button onClick={()=>{
            this.props.ws.hide('inputs', this.state.selectedImage, 'outputs', this.state.msg)
          }}>Hide</button>
        </div>
      )
    }

  }

  /************************** Unhide Component *************************/

  class Unhide extends React.Component {

    constructor(props) {
      super(props);
      //TODO other setup for Unhide
      this.state={images:[], selectedImage: undefined, msg:""}
      props.ws.list('outputs').then((images)=>{
        images.forEach((image, key)=>{
          props.ws.getImage('outputs', image).then((imageResult)=>{
            const newImages = this.state.images.map(i=>i)
            newImages.push(imageResult)
            this.setState({images:newImages})
          })
        })
      })
    }

    //TODO other methods for Unhide

    render() {
      //TODO rendering code
      return(
        <div>
          <input type="text" onChange={(e)=> this.setState({msg:e.target.value})} value={this.state.msg} />
          <input type="file" />
          <ul>
            {this.state.images && this.state.images.map((image, key)=>{
              return (
                <li key={key}>
                  <HideOption selectImage={(imageName)=>{
                    console.log("Selected Image "+imageName)
                    this.setState({selectedImage: imageName})
                  }} base64={image.data} selectedImage={this.state.selectedImage} imageName={image.name}/>
                </li>
              )
            })}
          </ul>
          <button onClick={()=>{
            this.props.ws.unhide('outputs', this.state.selectedImage).then((msg)=>{
              this.setState({msg:msg})
            })
          }}>Unhide</button>
        </div>
      )
    }

  }

  function HideOption(props){
    return(
        <img className={`thumbnail ${props.imageName===props.selectedImage ? "selected":""}`} onClick={()=>props.selectImage(props.imageName)} src={`data:image/png;base64,${props.base64}`}/>
    )
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
