<!DOCTYPE html>
<html>
  <head>
    <title>Update a User</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1>Update a User</h1>
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
    <form method="POST" action="{{{base}}}/update.html">
       <p>
	 Please fill in one or more of the following fields
        </p>
	{{#fields}}
	    <label>
	    <span class="label">{{friendlyName}}:</span>
	    {{#isId}}
	      {{value}}
	      <input name="{{name}}" type="hidden" value="{{value}}">
	    {{/isId}}
	    {{^isId}}
	    <input name="{{name}}" {{#type}}type="{{type}}"{{/type}}
	           value="{{value}}">
	    {{/isId}}
	    </label>
	    <br/>
	    {{#errorMessage}}
	      <span class="error">{{errorMessage}}</span><br/>
	    {{/errorMessage}}
	 {{/fields}}
      <input name="submit" type="submit" value="update" class="control">
    </form> 
    {{>footer}}
  </body>
</html>
