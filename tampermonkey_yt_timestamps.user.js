// ==UserScript==
// @name         YouTube Insert Timestamp Buttons (PC)
// @version      1.2
// @description  Adds 3 Buttons to insert Timestamp into Comment to the Comment Footer. The Buttons are "current timestamp", -5s and -10s
// @author       stray-tori
// @match        *://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://github.com/stray-tori/utilities/raw/refs/heads/main/tampermonkey_yt_timestamps.user.js
// @updateURL    https://github.com/stray-tori/utilities/raw/refs/heads/main/tampermonkey_yt_timestamps.user.js
// ==/UserScript==

(function() {
    'use strict';

    function formatNumber(number) {
        return String(number).padStart(2, '0')
    }

    function insertTimestampIntoComment(offset) {
        const time = document.querySelector(".video-stream").currentTime + offset
        var hours = formatNumber(parseInt(time/(60*60),10));
        var minutes = formatNumber(parseInt(time / 60, 10)-hours*60);
        var seconds = formatNumber(parseInt(time % 60));

        var timestr = ""
        if (hours > 0) {
            timestr += hours+":"
        }
        timestr += minutes+":"+seconds

        const commentBox = document.querySelector('#contenteditable-root');
        if (time && commentBox) {
            const textNode = document.createTextNode(timestr + " ");
            const selection = window.getSelection();

            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);

                // Make sure the selection is within commentBox
                if (commentBox.contains(range.commonAncestorContainer)) {
                    console.log("Inserting at cursor:", range);
                    range.insertNode(textNode);

                } else {
                    commentBox.appendChild(textNode);
                }
            }
            commentBox.focus()

            var cursorRange = document.createRange()
            cursorRange.setStartAfter(textNode)

            selection.removeAllRanges()
            selection.addRange(cursorRange)
        } else {
            console.log("Current time or comment box not available")
        }
    }

    function insertButtonWithOffset(offset) {
        const button = document.createElement('button');
        button.id = 'yt-timestamp-button';
        button.textContent = '🕗';

        if (offset != 0) {
            button.textContent += offset
        }

        Object.assign(button.style, {
            padding: '0.5em 0.7em',
            paddingRight: '0.8em',
            marginRight: '0.5em',
            backgroundColor: '#292929',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '2em',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            fontWeight: 'bold'
        });

        button.onclick = () => insertTimestampIntoComment(offset)

        document.querySelector("#comment-dialog #footer").insertBefore(button, document.querySelector("#comment-dialog #attachments"));
    }

    function insertButtons() {
        if (document.getElementById('yt-timestamp-button')) return;

        insertButtonWithOffset(0)
        insertButtonWithOffset(-5)
        insertButtonWithOffset(-10)

        /** TODO doesnt work
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && (event.key === 't' || event.key === 'T')) {    //Keybind
                event.preventDefault();
                button.click();
            }
        });
        **/
    }

    const observer = new MutationObserver(() => {
        if (window.location.href.includes('watch')) {
            const commentBoxFooter = document.querySelector("#comment-dialog #footer")
            if (commentBoxFooter) {
                insertButtons();
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
