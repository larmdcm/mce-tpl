/**
 *  author: larmdcm
 *  date:2019.9.3
 *  remark:模板引擎
 */
;(function (factory) {
	"use strict";
	window.mceTpl = factory({
		arrSlice: function (object) {
			return Array.prototype.concat.apply([],object).slice();
		},
		isFunction: function (func) {
			return typeof func === 'function';
		},
		isObject: function (object) {
			return typeof object === 'object';
		},
		printf: function (){
			var str = arguments[0];
			for (var i = 1; i < arguments.length; i++) {
				str = str.replace(new RegExp('\\{' + (i - 1) +'\\}','g'),arguments[i]);
			}
			return str;
		},
		isUfe: function (ufe) {
			return typeof ufe === 'undefined' || ufe === undefined;
		},
		merge: function (newObj,oldObj) {
			for (var k in newObj) {
				oldObj[k] = newObj[k];
			}
			return oldObj;
		},
		error: function (method,message) {
			 var error = "Mce: " + "[" + method + "] to " + message;
		  	 throw new Error(error);
		},
		isBoolean: function (bool) {
			return typeof bool === 'boolean'
		},
		isString: function (str) {
			return typeof str === 'string';
		},
		each: function (items,callback) {
			var result;
			for (var i in items) {
	        	 result = callback.call(this,items[i],i,items[i]);
	             if (this.isBoolean(result) && result === false) break; 
	        }
	        return this.isUfe(result) ? true : result;
		}
	});
}(function (toolFn) {
	var VERSION = '1.0'
	  , config  = {
		  	 openTag: "{{",
		  	 closeTag: "}}"
		  }
		  , cache = {computed: {}}
	  , Tpl = function () {
	  	  this.version    = VERSION;
	  	  this.id 		  = '';
	  	  this.className  = '';
	  	  this.el 		  = {};
	  	  this.data 	  = {
	  	  	"true": true,
	  	  	"false": false
	  	  };
	  	  this.methods 	= {
	  	  	linkTo: toolFn.isFunction(window.linkTo) ? window.linkTo : function () {}
	  	  };
	  	  this.filters  = {
	  	  	 toUpper: function (value) {
	  	  	 	return value.toUpperCase();
	  	  	 },
	  	  	 toLower: function (value) {
	  	  	 	return value.toLowerCase();
	  	  	 },
	  	  	 json: function (value) {
	  	  	 	return JSON.stringify(value);
	  	  	 }
	  	  };
	  	  this.computed = {};
	  }
	  , tplDirectiveStart = "m-"
	  , tplDirectives = {
	  	 text: tplDirectiveStart + "text",
	  	 html: tplDirectiveStart + "html",
	  	 forDirective: tplDirectiveStart + "for",
	  	 bind: tplDirectiveStart + "bind",
	  	 on: tplDirectiveStart + "on"
	  }
	  , ifResult = []
	  , tplUtil  = {
	  	replaceElement: function (el,fragment) {
	  		var parent = el.parentNode;
	  		parent && parent.replaceChild(fragment,el)
	  	},
	  	getData: function (exp,data,el) {
	  		 exp = " " + exp.trim();
			 var self = this
			   , reg  = /([\s\+\-\*\/%&\|\^!\*~]\s*?)([a-zA-Z_$][a-zA-Z_$0-9]*?)/g
			   , result
			   , filters = [];
			 if (exp.indexOf("|") !== -1) {
			 	filters = exp.split("|");
			 	exp = filters.shift();
			 }
			 exp = exp.replace(reg,function (a,b,c) {
			 	return b + "data." + c;
			 });
			 result = new Function("data", "'use strict';return " + exp).call(self,self.__bindComputed(data));
			 if (filters.length > 0) {
			 	filters.forEach(function (filter) {
			 		filter = filter.trim();
			 		var filterFn = self.filters[filter];
			 		result = toolFn.isFunction(filterFn) ? filterFn.call(self.__bindDataObject(),result) : 
			 				 compileError("mce.tpl.filters",filter + " filter is not a function");
			 	});
			 }
			 return result;
	  	}
	  }
	  , tplDirectiveHandles = {
	  	htmlHandle: function (el,data,value,name) {
	  		el.innerHTML = tplUtil.getData.call(this,value,data,el);
	  	},
	  	textHandle: function (el,data,value,name) {
	  		el.textContent = tplUtil.getData.call(this,value,data,el);
	  	},
	  	bindHandle: function (el,data,value,name) {
	  		var attrs = name.split(":")
	  		  , attr;
	  		if (attrs.length <= 1) {
	  			return compileError("mce.tpl.bind","for compile error ["+ tplDirectives.bind + "]:key bind key is error",el);
	  		}
	  		attr = attrs[1];
	  		el.setAttribute(attr,tplUtil.getData.call(this,value,data,el));

	  	},
	  	onHandle: function (el,data,value,name) {
	  		var attrs = name.indexOf(":") != -1 ? name.split(":") : name.split("@")
	  		  , attr
	  		  , event
	  		  , regexp = /(\w+)\(+(.*?)\)+/
	  		  , args   = []
	  		  , fn
	  		  , self   = this;
	  		if (attrs.length <= 1) {
	  			return compileError("mce.tpl.on","for compile error ["+ tplDirectives.on + "]:event on event is error",el);
	  		}
	  		event = attrs[1];
	  		if (regexp.test(value)) {
		  		var matchs = value.match(regexp)
		  		  , argStr = matchs[2];
		  		value = matchs[1];
	  			toolFn.each(argStr.indexOf(',') >= 0 ? argStr.split(',') : [argStr],function (item) {
	  				if (item.charAt(0) == '{' || item.charAt(0) == '[') {
	  					item = JSON.parse(item);
	  				} else if (item.charAt(0) == "'" || item.charAt(0) == '"') {
	  					item = item.substr(1);
	  					item = item.substr(0,item.length - 1);
	  				} else {
	  					item = tplUtil.getData.call(self,item,self.data);
	  				}
	  				args.push(item);
	  			});
	  		}
	  		fn = this.methods[value];
	  		if (!fn || !toolFn.isFunction(fn)) {
	  			return compileError("mce.tpl.on",toolFn.printf("{0} is not a function",value))
	  		}
	  		if (el.addEventListener) {
		  		el.addEventListener(event,fn.bind.apply(fn, [this.__bindDataObject()].concat(args)));
	  		} else {
	  			el.attachEvent("on" + event,fn.bind.apply(fn, [this.__bindDataObject()].concat(args)));
	  		}
	  	},
	  	ifHandle: function (el,data,value,name) {
	  		var result = tplUtil.getData.call(this,value,data,el)
	  		  , parent = el.parentNode;
	  		!result && parent && parent.removeChild(el);
	  		ifResult.push(result);
	  	},
	  	elseHandle: function (el,data,value,name) {
	  		var parent = el.parentNode;
	  		if (ifResult.length <= 0) {
	  			return compileError("mce.tpl.else","else not a if",el);
	  		}
	  		ifResult.shift() && parent && parent.removeChild(el);
	  	},
	  	showHandle: function (el,data,value,name) {
	  		var result = tplUtil.getData.call(this,value,data,el);
	  		if (!result) {
	  			el.style.display = 'none';
	  		}
	  	},
	  	forHandle: function (el,data,value) {
	  		var self	  = this
	  		  , fragment  = document.createDocumentFragment()
	  		  , reg       = /(\((\w+),(\w+)\)|(\w+))\s+in\s+(\w+)/
	  		  , matchs
	  		  , forData;
	  		if (!value.match(reg)) return compileError("mce.tpl.for","for compile error ["+ tplDirectives.forDirective +"=" + '"' + value + '"]',el);
	  		matchs = reg.exec(value);
	  		if (matchs.length >= 6 && matchs[5]) {
	  			if (self.computed[matchs[5]]) {
	  				forData = self.computed[matchs[5]].call(self.__bindDataObject());
	  			} else {
	  				forData = data[matchs[5]];
	  			}
	  			toolFn.each(forData,function (item,index) {
	  				var data = {}
	  				  , node = el.cloneNode(true);
	  				if (toolFn.isUfe(matchs[4])) {
	  					var  k = matchs[3].trim()
	  					   , v = matchs[2].trim();
	  					data[k] = index;
	  					data[v] = item;
	  				} else {
	  					var v 	= matchs[1].trim();
	  					data[v] = item;
	  				}
	  				node.removeAttribute(tplDirectives.forDirective);
	  				self.__compile(node,toolFn.merge(data,self.data));
	  				fragment.appendChild(node);
	  			});
	  			tplUtil.replaceElement(el,fragment);
	  		}
	  	}
	  }
	  , isTextElement = function (element) {
	  	 return element.nodeType === 3;
	  }
	  , isElement = function (element) {
	  	return element.nodeType === 1;
	  }
	  , isDirective = function (attr) {
	  	 return attr.indexOf(tplDirectiveStart) == 0;
	  }
	  , compileError = function (method,message,element) {
	  	 var template = "";
	  	 if (element) {
	  	 	template = element.parentNode ? element.parentNode.innerHTML || element.parentNode.textContent : element.innerHTML || element.textContent;
	  	 	message  = message + "\r\ntemplate: \r\n " + template;
	  	 }
	  	 return toolFn.error(method,message)
	  }
	  , isBindDriective = function (attr) {
	  	 return attr.substr(0,1) == ':';
	  }
	  , isEventDirective = function (attr) {
	  	 return attr.substr(0,1) == '@';
	  }
	  , createElement = function (html) {
	  	 var element = document.createElement("div");
	  	 element.innerHTML = html;
	  	 return element;
	  };

	  Tpl.prototype.render = function(options) {
	  	 this.id        = options.id || this.id;
	  	 this.className = options.className || this.className;
	  	 this.el 	    = options.content ? createElement.call(this,options.content) : createElement.call(this,(toolFn.isString(options.el) 
	  	 								? document.querySelector(options.el) : options.el).innerHTML);
	  	 this.data 	    = toolFn.merge(options.data || {},this.data);
	  	 this.methods   = toolFn.merge(options.methods || {},this.methods);
	  	 this.filters   = toolFn.merge(options.filters || {},this.filters);
	  	 this.computed  = toolFn.merge(options.computed || {},this.computed);
	  	 config = toolFn.merge(options.config || {},config);
	  	 this.__compile(this.el,this.data);
	  	 if (options.renderNode && options.appendNode) {
	  	 	return compileError("mce.tpl.render","renderNode and appendNode Cant exist at the same time")
	  	 }
		  	 if (this.id) {
	  	 	this.el.id  = this.id;
	  	 }
	  	 if (this.className) {
	  	 	this.el.className = this.className;
	  	 }
	  	 if (options.renderNode) {
	  	 	 var renderNode = toolFn.isString(options.renderNode) ? document.querySelector(options.renderNode) : options.renderNode;
			 if (!renderNode.parentNode) {
			 	return compileError("mce.tpl.render","renderNode parent node is null");
			 }
			 renderNode.parentNode.replaceChild(this.el,renderNode);
	  	 }
	  	 if (options.appendNode) {
	  	 	 var appendNode = toolFn.isString(options.appendNode) ? document.querySelector(options.appendNode) : options.appendNode;
	  	 	 appendNode.appendChild(this.el);
	  	 }
	  	 return this.el;
	  };
	  Tpl.prototype.config = function(configs) {
	  	 config = toolFn.merge(configs,config);
	  	 return this;
	  };
	  Tpl.prototype.__compile = function(el,data) {
	  	  var self = this;
	  	  if (isTextElement(el)) {
	  	  	self.__compileTextElement(el,data);
	  	  } else {
	  	  	self.__compileNodeElement(el,data);
	  	  	if (el.hasAttribute && el.hasAttribute(tplDirectives.forDirective)) {
	  	  		return;
	  	  	}
	  	  	if (el.childNodes && el.childNodes.length > 0) {
	  	  		toolFn.arrSlice(el.childNodes).forEach(function (el) {
	  	  			self.__compile(el,data);
	  	  		});
	  	  	}
	  	  }
	  };
	  Tpl.prototype.__compileTextElement = function(el,data) {
	  	  var reg = new RegExp(config.openTag + '(.*?)' + config.closeTag,'g')
	  	    , match
	  	    , normalText
	  	    , content = el.textContent
	  	    , lastIndex = 0
	  	    , element
	  	    , fragment  = document.createDocumentFragment();
	  	  if (!content.match(reg)) return;
	      while(match = reg.exec(content)){
	        if(match.index > lastIndex){
	            normalText = content.slice(lastIndex,match.index);
	            element = document.createTextNode(normalText);
	            fragment.appendChild(element);
	        }
	        lastIndex = reg.lastIndex;
	        var exp = match[1].trim();
	        element = document.createTextNode(' ');
	        element.textContent = tplUtil.getData.call(this,exp,data,element);
	        fragment.appendChild(element);
	    }
	    if(lastIndex < content.length){
	        normalText = content.slice(lastIndex);
	        element = document.createTextNode(normalText);
	        fragment.appendChild(element);
	    }

	    tplUtil.replaceElement(el,fragment);
	  };
	  Tpl.prototype.__compileNodeElement = function(el,data) {
	  	  var self   = this
	  	     , attrs = el.attributes;
	  	  if (el.hasAttribute && el.hasAttribute(tplDirectives.forDirective)) {
	  	  	  var handle = tplDirectives.forDirective.substr(2);
	  	  	  handle = handle + "Handle";
	  	  	  return tplDirectiveHandles[handle] && tplDirectiveHandles[handle].call(self,el,data,el.getAttribute(tplDirectives.forDirective));
	  	  }
	  	  toolFn.arrSlice(attrs).forEach(function (attr) {
	  	  	  var name = attr.name
	  	  	    , value = attr.value;
	  	  	  if (isDirective(name)) {
	  	  	  	 var handle = name.substr(2);
	  	  	  	 if (handle.indexOf(":") !== -1) {
	  	  	  	 	handle = handle.split(":")[0];
	  	  	  	 }
	  	  	  	 handle = handle + "Handle";
	  	  	  	 tplDirectiveHandles[handle] && tplDirectiveHandles[handle].call(self,el,data,value,name);
		  	  	 el && el.hasAttribute(name) && el.removeAttribute(name);
	  	  	  } else if (isBindDriective(name)) {
	  	  	  	 tplDirectiveHandles.bindHandle.call(self,el,data,value,name);
		  	  	 el && el.hasAttribute(name) && el.removeAttribute(name);
	  	  	  } else if (isEventDirective(name)) {
	  	  	  	 tplDirectiveHandles.onHandle.call(self,el,data,value,name);
		  	  	 el && el.hasAttribute(name) && el.removeAttribute(name);
	  	  	  }
	  	  });
	  };
	  Tpl.prototype.__bindDataObject = function () {
	  	   var dataObject = new (function TplData () {})
	  	     , attrs = ['data','methods']
	  	     , self  = this;
	  	   toolFn.each(attrs,function (item) {
	  	   		dataObject = toolFn.merge(toolFn.isObject(self[item]) ? self[item] : {},dataObject);
	  	   });
	  	   return self.__bindComputed(dataObject);
	  };
	  Tpl.prototype.__bindComputed = function (data) {
	  	  var  dataObject = new (function TplData () {})
	  	     , self = this;
	  	  toolFn.each(self.computed,function (fn,attr) {
		  	   Object.defineProperty(dataObject,attr,{
		  	   	  get: function () {
		  	   	  	if (cache.computed[attr]) return cache.computed[attr];
		  	   	  	return cache.computed[attr] = fn.call(self.__bindDataObject());
		  	   	  }
		  	   });
	  	   });
	  	  return toolFn.merge(data,dataObject);
	  };
	return new Tpl();
}));