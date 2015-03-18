domv-popup
==========
Display DOM elements with fixed position (a popup) relative to an "owning" element. This is a neat workaround for stacking context limitations in CSS (z-index, overflow:hidden, et cetera)

This is a CommonJS module, you will need to use [browserify](http://browserify.org/).

Usage
-----
Each `Popup` instance is a simple `<div>` element with fixed positioning (`position:fixed`). This popup will be positioned relative to a specified `owner` element. If the owner element changes position for whatever reason _(window resize, scrolling, style changes by javascript, et cetera)_, so will the popup. The popup will also receive a max-width and max-height to prevent it from going outside the browser viewport.

Example:

```javascript
var domv = require('domv');
var Popup = require('domv-popup');
var doc = domv.wrap(document);
var myButton = doc.selector('#myButton');
var myPopup;
var myPopupVisible = false;

// Toggle button to open/close the popup
myButton.on('click', function(e)
{
    if (myPopupVisible)
    {
        // hide the popup
        myPopupVisible = false;

        // by removing it from the document
        myPopup.removeNode();
    }
    else
    {
        // show the popup
        myPopupVisible = true;

        if (!myPopup)
        {
            // myButton is the owner of this Popup
            myPopup = Popup.get(myButton);
            myPopup.addClass('myPopup');
            myPopup.textContent = 'This is a popup!';

            // The top side of the popup is aligned the bottom side of the button
            myPopup.alignTop = Popup.ALIGNMENT.BOTTOM;

            // The left side of the popup is aligned the left side of the button
            myPopup.alignLeft = Popup.ALIGNMENT.LEFT;

            // The right side of the popup is aligned the right side of the button
            myPopup.alignRight = Popup.ALIGNMENT.RIGHT;
        }

        // Add the popup back to the document after it has been previously removed
        myPopup.addToAncestorOfOwner();

        // Immediately update the position
        myPopup.updatePositionNow();

        // Automatically update the position as needed
        // If the popup is removed from the document, the automatic updating stops
        myPopup.autoUpdatePosition();
    }
});

```