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

  const hideStates = []
  const unhideStates = []

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
        return;
      }
      catch (err) {
        throw (err.response && err.response.data) ? err.response.data : err;
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
      this.state={images:[], selectedImage: undefined, msg:"", fileMsg:"", error:""}

    }

    componentDidMount(){
      const prevState = hideStates.pop() 
      if(prevState) 
        this.setState({selectedImage: prevState.selectedImage, msg: prevState.msg, fileMsg: prevState.fileMsg})
      this.props.ws.list('inputs').then((images)=>{
        images.forEach((image, key)=>{
          this.props.ws.getImage('inputs', image).then((imageResult)=>{
            const newImages = this.state.images.map(i=>i)
            newImages.push(imageResult)
            this.updateState({...this.state, images:newImages})
          })
        })
      })
    }

    updateState(state){
      hideStates.push(state)
      this.setState({...state, error:""})
    }

    componentDidCatch(error, info) {
      this.updateState({...this.state, error})
    }
    
    //TODO other methods for Hide
    validate(){
      return (this.state.msg.length>0 || this.state.fileMsg.length>0) && this.state.selectedImage && !(this.state.msg.length>0 && this.state.fileMsg.length>0)
    }

    getError(){
      let error = ""
      if(this.state.msg.length==0 && this.state.fileMsg.length==0){
       error+="Please enter a message. "
      }
      if(this.state.msg.length>0 && this.state.fileMsg.length>0){
        error+="Please either enter a message in textbox or choose a file with text, not both. "
      }
      if(this.state.selectedImage===undefined){
       error+="Please select an image"
      }
      this.setState({error: error})
    }

    render() {
      //TODO rendering code
      return(
        <div>
          <input type="text" onChange={(e)=> this.updateState({...this.state, msg:e.target.value})} value={this.state.msg} />
          <span id="or">OR</span>
          <input type="file" multiple="false" onChange={(e)=>{
            console.log("On change fired ")
            readFile(e.target.files[0]).then((msg)=>{
              this.updateState({...this.state, fileMsg:msg})
            })
          }} onClick={(e)=>e.target.value=null}/>
          <ul>
            {this.state.images && this.state.images.map((image, key)=>{
              return (
                <li key={key}>
                  <HideOption selectImage={(imageName)=>{
                    console.log("Selected Image "+imageName)
                    this.updateState({...this.state, selectedImage: imageName})
                  }} base64={image.data} selectedImage={this.state.selectedImage} imageName={image.name}/>
                </li>
              )
            })}
          </ul>
          <button onClick={()=>{
            const msg = this.state.msg || this.state.fileMsg;
            const app = this.props.app
            if(this.validate()){
              this.props.ws.hide('inputs', this.state.selectedImage, 'outputs', msg).then(()=>{
                app.select("unhide")
              }).catch((e)=>this.updateState({...this.state, error: e}))
            }else{
              this.getError()
            }
          }}>Hide</button>
          <button onClick={()=>{
            this.updateState({selectedImage:undefined, msg:"", fileMsg:""})
          }}>Clear</button>
          <div className="error">
            {this.state.error.length > 0 && this.state.error}
          </div>
        </div>
      )
    }

  }

  /************************** Unhide Component *************************/

  class Unhide extends React.Component {

    constructor(props) {
      super(props);
      //TODO other setup for Unhide
      this.state={images:[], selectedImage: undefined, msg:"", error:""}
    }

    updateState(state){
      unhideStates.push(state)
      this.setState({...state, error:""})
    }

    componentDidMount(){
      console.log("componentDidMount Unhide")
      const prevState = unhideStates.pop()
      if(prevState) {
        this.setState({selectedImage: prevState.selectedImage, msg: prevState.msg})
      }
      this.props.ws.list('outputs').then((images)=>{
        if(prevState && (images.length > prevState.images.length)) prevState.selectedImage=undefined;
        images.forEach((image, key)=>{
          this.props.ws.getImage('outputs', image).then((imageResult)=>{
            let selectedImage=undefined;
            const newImages = this.state.images.map(i=>i)
            newImages.push(imageResult)
            let prevImages = prevState ? prevState.images : [];
            prevImages = prevImages.filter(i=>i.name===image)
            if(prevState && prevImages.length===0) selectedImage=image
            if(prevState && prevState.selectedImage) selectedImage = prevState.selectedImage
            this.updateState({...this.state, images:newImages, selectedImage})
          })
        })
      })
    }
    componentDidCatch(error, info) {
      this.updateState({...this.state, error})
    }

    validate(){
      return this.state.selectedImage != undefined
    }

    getError(){
      let error = ""
      if(this.state.selectedImage===undefined){
       error+="Please select an image"
      }
      this.setState({error: error})
    }
    //TODO other methods for Unhide

    render() {
      //TODO rendering code
      return(
        <div>
          <input type="text" onChange={(e)=> this.updateState({...this.state, msg:e.target.value})} value={this.state.msg} />
          <ul>
            {this.state.images && this.state.images.map((image, key)=>{
              return (
                <li key={key}>
                  <HideOption selectImage={(imageName)=>{
                    console.log("Selected Image "+imageName)
                    this.updateState({...this.state, selectedImage: imageName})
                  }} base64={image.data} selectedImage={this.state.selectedImage} imageName={image.name}/>
                </li>
              )
            })}
          </ul>
          <button onClick={()=>{
            if(this.validate()){
              this.props.ws.unhide('outputs', this.state.selectedImage).then((msg)=>{
                this.setState({msg:msg})
              }).catch((e)=>this.updateState({...this.state, error: e}))
            }else{
              this.getError()
            }
          }}>Unhide</button>
          <button onClick={()=>{
            this.updateState({selectedImage:undefined})
          }}>Clear</button>
          <div className="error">
            {this.state.error.length > 0 && this.state.error}
          </div>
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
