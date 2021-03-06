'use strict';
var domv = require('domv');
var shortId = require('shortid');
var lazyTimer = require('lazy-timer');

function Popup(node, tagName)
{
        domv.Component.call(this, node, tagName || 'div');

        this.owner = null;
        this._ancestorWithListeners = null;

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('Popup');
                this.attr('id', 'Popup' + shortId.generate());
        }
        else
        {
                this.assertHasClass('Popup');
        }

        // call to schedule a position update (once)
        this.updatePosition = lazyTimer(10, false, this, this.updatePositionNow);

        // call to keep scheduling position updates until this popup is no longer part of the document
        // or no longer visible
        this.autoUpdatePosition = lazyTimer(10, false, this, this._autoUpdatePositionImpl);
}

module.exports = Popup;
require('inherits')(Popup, domv.Component);

Popup.ALIGNMENT = {
        NONE  : null,
        TOP   : 'top',
        RIGHT : 'right',
        BOTTOM: 'bottom',
        LEFT  : 'left'
};

Popup.findAncestorElement = function(owner)
{
        var ancestor = owner;

        if (!owner)
        {
                return null;
        }

        if (!owner.isDOMVComponent)
        {
                owner = domv.wrap(owner);
        }

        while (ancestor.parentNode &&
               ancestor.parentNode.outerNodeType === domv.NodeType.ELEMENT)
        {
                if (ancestor.outerNodeName === 'body')
                {
                        break;
                }

                ancestor = ancestor.parentNode;
        }

        if (ancestor.isOuterNodeEqual(owner))
        {
                return null;
        }

        return ancestor;
};

Popup.get = function(owner)
{
        if (!owner)
        {
                return null;
        }

        var id = owner && owner.getAttr('data-domv-popup-id');

        var ancestor = Popup.findAncestorElement(owner);
        var popup = null;

        if (!ancestor)
        {
                return null;
        }

        if (id)
        {
                popup = ancestor.outerNode.getElementById(id);
        }

        if (!popup)
        {
                popup = new Popup(owner.document);
                ancestor.appendChild(popup);
                popup.addAncestorListeners();
                owner.attr('data-domv-popup-id', popup.id);
        }

        popup.owner = owner;

        return popup;
};

Popup.prototype.addAncestorListeners = function()
{
        this.removeAncestorListeners();

        var ancestor = this.parentNode;
        while (ancestor && ancestor.parentNode)
        {
                ancestor = ancestor.parentNode;
        }

        this._ancestorWithListeners = ancestor;
        if (this._ancestorWithListeners)
        {
                this._ancestorWithListeners.on('mousedown', this._ancestorMouseDown, true, this);
                this._ancestorWithListeners.on('focus', this._ancestorFocus, true, this);
        }
};

Popup.prototype.removeAncestorListeners = function()
{
        if (this._ancestorWithListeners)
        {
                this._ancestorWithListeners.removeListener('mousedown', this._ancestorMouseDown, true, this);
                this._ancestorWithListeners.removeListener('focus', this._ancestorFocus, true, this);
        }

        this._ancestorWithListeners = null;
};

Popup.prototype.addToAncestorOfOwner = function()
{
        var ancestor = Popup.findAncestorElement(this.owner);
        if (ancestor)
        {
                ancestor.appendChild(this);
                this.addAncestorListeners();
        }
};

Object.defineProperty(Popup.prototype, 'id', {
        get: function()
        {
                return this.getAttr('id');
        }
});

Object.defineProperty(Popup.prototype, 'alignTop', {
        get: function()
        {
                return this.getAttr('data-align-top');
        },
        set: function(value)
        {
                this.attr('data-align-top', value);
        }
});

Object.defineProperty(Popup.prototype, 'alignRight', {
        get: function()
        {
                return this.getAttr('data-align-right');
        },
        set: function(value)
        {
                this.attr('data-align-right', value);
        }
});

Object.defineProperty(Popup.prototype, 'alignBottom', {
        get: function()
        {
                return this.getAttr('data-align-bottom');
        },
        set: function(value)
        {
                this.attr('data-align-bottom', value);
        }
});

Object.defineProperty(Popup.prototype, 'alignLeft', {
        get: function()
        {
                return this.getAttr('data-align-left');
        },
        set: function(value)
        {
                this.attr('data-align-left', value);
        }
});

Popup.prototype.updatePositionNow = function()
{
        var document = this.document;
        var ownerOuter = this.owner && this.owner.outerNode;

        if (!ownerOuter)
        {
                return;
        }

        var rect = ownerOuter.getBoundingClientRect();

        var html = document.documentElement;

        var align = {
                top   : this.alignTop,
                right : this.alignRight,
                bottom: this.alignBottom,
                left  : this.alignLeft
        };

        var popupRect = {};

        Object.keys(align).forEach(function(side)
        {
                if (!align[side])
                {
                        this.style[side] = null;
                        popupRect[side] = null;
                        return;
                }

                popupRect[side] = rect[align[side]];

                if (side === 'right')
                {
                        this.style[side] = (html.clientWidth - popupRect[side]) + 'px';
                }
                else if (side === 'bottom')
                {
                        this.style[side] = (html.clientHeight - popupRect[side]) + 'px';
                }
                else
                {
                        this.style[side] = popupRect[side] + 'px';
                }
        }, this);

        if (popupRect.left && popupRect.right === null)
        {
                this.style.maxWidth = html.clientWidth - popupRect.left + 'px';
        }
        else if (popupRect.left === null && popupRect.right)
        {
                this.style.maxWidth = popupRect.right + 'px';
        }
        else
        {
                this.style.maxWidth = null;
        }

        if (popupRect.top && popupRect.bottom === null)
        {
                this.style.maxHeight = html.clientHeight - popupRect.top + 'px';
        }
        else if (popupRect.top === null && popupRect.bottom)
        {
                this.style.maxHeight = popupRect.bottom + 'px';
        }
        else
        {
                this.style.maxHeight = null;
        }

        this.style.position = 'fixed';
};


Popup.prototype._autoUpdatePositionImpl = function()
{
        /*jshint -W016*/

        // DOCUMENT_POSITION_DISCONNECTED = 1

        // we are no longer reachable to the owner
        // the owner might have been removed from the document, or we have been removed from the document
        if (!this.owner ||
            !this.owner.outerNode ||
            this.owner.outerNode.compareDocumentPosition(this.outerNode) & 1)
        {
                this.removeAncestorListeners();
                this.removeNode(); // if the owner has removed, remove the popup too
                return; // stop updating the position
        }

        this.updatePositionNow();

        this.autoUpdatePosition();
};

Popup.prototype.nodeBelongsToPopupOrOwner = function(node)
{
        /*jshint -W016*/
        if (node === this.outerNode ||
            node.compareDocumentPosition(this.outerNode) & 8 ) // outerNode contains target
        {
                return true;
        }

        if (this.owner &&
            this.owner.outerNode &&
            node === this.owner.outerNode ||
            node.compareDocumentPosition(this.owner.outerNode) & 8 ) // owner contains target
        {
                return true;
        }

        return false;
};

Popup.prototype._ancestorMouseDown = function(e)
{
        /*jshint -W016*/

        if (this.nodeBelongsToPopupOrOwner(e.target))
        {
                return;
        }

        this.emit('domv-popup-outside-mousedown', {
                domvTarget: e.target,
                domvPopup: this
        });
};

Popup.prototype._ancestorFocus = function(e)
{
        if (this.nodeBelongsToPopupOrOwner(e.target))
        {
                return;
        }

        this.emit('domv-popup-outside-focus', {
                domvTarget: e.target,
                domvPopup: this
        });
};
