/** =======================================================================
 *  Erik Dahlstrom
 *  License terms: see svg-wow.org
 *  CC0 http://creativecommons.org/publicdomain/zero/1.0/
 *  ======================================================================= */
/**
 * A basic drag class.
 */
function DragObject(elm, parentobj)
{
	this.elm = elm;
	this.pos = null;
	this.scale = 1;
	this.rotation = 0;
	this.active = false;
	this.parent = parentobj;
	this.elm.addEventListener("mousedown", this, false);
	document.documentElement.addEventListener("mousemove", this, false);
	document.documentElement.addEventListener("mouseup", this, false);
}

DragObject.prototype.setActive = function(isactive) {	
	this.active = isactive;
	if(this.active)
		this.elm.className.baseVal += " active";
	else
		this.elm.className.baseVal = this.elm.className.baseVal.replace(/active/, "");
	
	if(window.gfocused)
	{
		if(window.gfocused != this && isactive)
		{
			window.gfocused.setActive(false);
		}		

		window.gfocused = isactive ? this : null;
	}
	else if(isactive)
	{
		window.gfocused = this;
	}
}

DragObject.prototype.zoomIn = function(val) {
	this.scale *= val ? val : 1.5;
	this.setPosition(this.pos);
}

DragObject.prototype.zoomOut = function(val) {
	this.scale *= val ? val : 0.75;
	this.setPosition(this.pos);
}

DragObject.prototype.rotateClockwise = function(val) {
	this.rotation += val ? val : 10;
	this.setPosition(this.pos);
}

DragObject.prototype.rotateCounterClockwise = function(val) {
	this.rotation -= val ? val : 10;
	this.setPosition(this.pos);
}


DragObject.prototype.handleEvent = function(e)
{
	switch(e.type)
	{
		case "mouseover":
			return this.mouseover(e);
		case "mousedown":
			return this.mousedown(e);
		case "mousemove":
			return this.mousemove(e);
		case "mouseup":
			return this.mouseup(e);
	}
}

DragObject.prototype.mousedown = function(e)
{
	if(this.parent.active != null && this.parent.active != this)
		this.parent.active.setActive(false);
		
	this.setActive(true);
	this.elm.parentNode.appendChild(this.elm);
	this.dispatchEvent("dragstart");
}

DragObject.prototype.mouseup = function(e)
{
	if(this.active)
		this.dispatchEvent("dragend");
	
	this.active = false;
}

DragObject.prototype.mouseover = function(e)
{
}

DragObject.prototype.mousemove = function(e)
{
	if(this.active)
	{
		var uu = toUserUnits(this.elm, e);
		this.setPosition(uu);
		paletteSensor.setControlPoint({x: e.clientX, y: e.clientY});
		e.stopPropagation();
	}
	
	return false;
}

DragObject.prototype.dispatchEvent = function(eventname)
{
	function dispatchInternal(fn)
	{
		if(fn && fn[eventname])
			fn[eventname](this);
	};
	
	if("Array" == classOf(this.listeners))
	{
		for(var i=0; i < this.listeners.length; i++)
		{
			dispatchInternal(this.listeners[i]);
		}
	}
	else
	{
		dispatchInternal(this.listeners);
	}
}

DragObject.prototype.setPosition = function(uu)
{
	this.pos = uu;
	this.dispatchEvent("drag");
	this.elm.setAttribute("transform", "translate("+uu.x + " " + uu.y + ") scale(" + this.scale + ") translate("+ (-uu.x) + " " + (-uu.y) + ") rotate(" + this.rotation + " " + uu.x + " " + uu.y + ") translate("+uu.x + " " + uu.y + ")");
}

function $(id) { return document.getElementById(id); }

/**
 * Utility method for determining the class of an object.
 */
function classOf(o) {
	if (undefined === o) 
		return "Undefined";
	if (null === o) 
		return "Null";
	return {}.toString.call(o).slice(8, -1);
}

/**
 * Convert the event coordinates to user units for the given node
 * @param node The node
 * @param e The Event object (as given from e.g an onclick handler)
 */
function toUserUnits(node, e)
{
	var point = document.documentElement.createSVGPoint();
	point.x = e.clientX;
	point.y = e.clientY;
	var refelm = node;
	if(refelm != document.documentElement)
		refelm = node.parentNode;
		
	return point.matrixTransform(refelm.getScreenCTM().inverse());
}
