<!DOCTYPE html>
<html>
  <head>
    <title>Create a User</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1>Create a User</h1>
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
    <form method="POST" action="{{{base}}}/create.html">
       <p>
	 Please fill in one or more of the following fields
        </p>
	{{#fields}}
	    <label>
	    <span class="label">
	      {{#isRequired}}* {{/isRequired}}{{friendlyName}}:
	    </span>
	    <input name="{{name}}" {{#type}}type="{{type}}"{{/type}}
	           value="{{value}}">
	    </label>
	    <br/>
	    {{#errorMessage}}
	      <span class="error">{{errorMessage}}</span><br/>
	    {{/errorMessage}}
	 {{/fields}}
      <input name="submit" type="submit" value="create" class="control">
    </form> 
    {{>footer}}
  </body>
</html>
