// ==UserScript==
// @name         Vikunja - Project UI Tweaks
// @namespace    http://tampermonkey.net/
// @version      2026-01-03
// @description  try to take over the world!
// @author       You
// @match        https://SETUP:-YOUR-VIKUNJA-URL/*
// @grant        none
// @downloadURL  https://github.com/stray-tori/utilities/raw/refs/heads/main/vikunja_project-display-tweaks.user.js
// @updateURL    https://github.com/stray-tori/utilities/raw/refs/heads/main/vikunja_project-display-tweaks.user.js
// ==/UserScript==

(async function() {
    'use strict';


    // ----------------
    // CONFIG VARIABLES
    const preferences_id = "GM_Vikunja_Project_Preferences"
    const preferences_default = { project_location: 0, show_identifier: false, fallback_identifier_show_title: true, hide_last_viewed: false }

    let debug = true;

    // Function to log messages if debug is true
    function log (...messages) {
        if (debug) {
            console.log('[Vikunja Project UI Tweaks]', ...messages);
        }
    };
   

    // ---------------
    // STORAGE FUNCTIONS

    function getJwtToken() {
        return localStorage.getItem('token');
    }

    function storage_loadPreferences() {
        preferences = localStorage.getItem(preferences_id)

        if (!preferences) {
            preferences = preferences_default
            log('No preferences found - using default')
        } else {
            preferences = JSON.parse(preferences)

            let pref_keys = Object.keys(preferences);
            let pref_default_keys = Object.keys(preferences_default);

            log("Pref keys: "+pref_keys)
            log("Default keys: "+pref_default_keys)
            
            if (pref_keys.length != pref_default_keys.length) {
                for (let key of pref_default_keys) {
                    if (!pref_keys.includes(key)) {
                        log(`${key} is missing, setting default`)
                        preferences[key] = preferences_default[key]
                    }
                }
                log("Updated keys: "+JSON.stringify(preferences))
                storage_savePreferences();
            }
        }
    }

    function storage_savePreferences() {
        localStorage.setItem(preferences_id, JSON.stringify(preferences));
    }

    // ------------
    // GLOBALS
    let preferences;
    storage_loadPreferences()
    // project_location: 0 = unchanged, -1 = left everywhere, 1 = right everywhere
    // show_identifier: shows identifier instead of project name everywhere

    const token = getJwtToken();

    if (!token) {
        log('JWT Token not found.');
        return;
    }

    let lastUrl = ""
    let currentUrlWasHandled = false;

    let projects;

    // --------------------------
    // PREFERENCES FUNCTIONS

    function updatePreferences() {
        document.getElementById("project_ui_settings_save_button").innerHTML = "SAVING..."
        let user_prefs = document.getElementById("project_ui_settings_input").value;

        preferences = JSON.parse(user_prefs);
        storage_savePreferences();
        storage_loadPreferences();

        if (JSON.stringify(JSON.parse(user_prefs)) == JSON.stringify(preferences)) {
            document.getElementById("project_ui_settings_save_button").innerHTML = "SAVED :)"
        }
    }

    function addSettingsPanelForPreferences(settings_div) {
        const settings_panel = settings_div.cloneNode(true);
        settings_panel.id = "project_ui_settings_panel"
        settings_panel.querySelector("header p").innerHTML = "[USER SCRIPT] Project UI Tweaks Settings"

        let settings_panel_fieldgroup = settings_panel.querySelector("div.field-group")

        // clear the inputs
        while (settings_panel_fieldgroup.hasChildNodes()) {
            settings_panel_fieldgroup.removeChild(settings_panel_fieldgroup.firstChild);
        }

        settings_panel.querySelector(".card-content").style.paddingTop = "0px";

        let explanation = document.createElement("ul");
        explanation.style.marginTop = "0px"
        explanation.appendChild(createListItem("project_location: 0 = unchanged, -1 = left everywhere, 1 = right everywhere"))
        explanation.appendChild(createListItem("show_identifier: shows identifier instead of project name everywhere"))
        explanation.appendChild(createListItem("fallback_identifier_show_title: If show_identifier = true but no identifier is set, keep the project name"))
        

        settings_panel_fieldgroup.appendChild(explanation)

        let text_input = document.createElement("textarea");
        text_input.id = "project_ui_settings_input";
        text_input.classList.add("input");
        text_input.value = JSON.stringify(preferences);
        settings_panel_fieldgroup.appendChild(text_input);

        let preferences_button = document.createElement("button");
        preferences_button.id = "project_ui_settings_save_button";
        preferences_button.classList.add("button");
        preferences_button.innerHTML = "SAVE";
        preferences_button.style.marginTop = "0.5em";
        preferences_button.onclick = () => updatePreferences();
        settings_panel_fieldgroup.appendChild(preferences_button)

        document.querySelector("section.view").insertBefore(settings_panel, settings_div);
    }

    function createListItem(text) {
        let list_item = document.createElement("li");
        list_item.innerHTML = text
        return list_item
    }


    //----------------------
    // Identifier Functions

    async function loadProjects() {
        const response = await fetch('/api/v1/projects', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        projects = await response.json();
        log("Fetched projects: ",projects)
        return projects;
    }

    loadProjects();

    function getProjectIdentifier(project_id) {
        for (let project of projects) {
            if (project["id"] == project_id) {
                return project["identifier"]
            }
        }

        return ""
    }

    function handleProjectName(task_divs) {
        if (preferences["show_identifier"]) {   // only if show_identifier is true
            for (let task_div of task_divs) {
                let task_project = task_div.querySelector(".task-project")

                //check if already changed
                if (!task_project.classList.contains("US_handled")) {
                    log("Task hasn't been handled, continuing.")

                    //get task id from url of link
                    log("Project URL: "+task_project.href)
                    let project_id = task_project.href.substring(task_project.href.lastIndexOf('/') + 1)    //get last url segment for ID
                    log("Project ID: "+project_id)
                    
                    let project_identifier = getProjectIdentifier(project_id);
                    log("Project-Identifier: "+project_identifier)

                    // only replace if no fallback wanted and identifier isn't empty
                    if (!(preferences["fallback_identifier_show_title"] && project_identifier=="") ) {
                        task_project.innerHTML = project_identifier
                    }

                    task_project.classList.add("US_handled")
                }
            }
        }
    }

    

    //----------------------
    // Moving project
    function handleMovingProject(task_divs) {
        if (preferences["project_location"] != 0) {
            for (let task_div of task_divs) {
                let task_text = task_div.querySelector(".tasktext")
                let task_project = task_div.querySelector(".task-project")
                let index_text = Array.prototype.indexOf.call(task_div.children, task_text);
                let index_project = Array.prototype.indexOf.call(task_div.children, task_project);

                let elements_to_move = []
                if (task_div.querySelector(".color-bubble")) {
                    elements_to_move.push(task_div.querySelector(".color-bubble")) //color bubble if it exists
                }
                elements_to_move.push(task_project)

                log(`Task Index: ${index_text}, Project Index: ${index_project}`);
                // Move project name to the left if it isn't there and preference is left
                if (index_text < index_project && preferences["project_location"]==-1) {
                    for (let element of elements_to_move) {
                        task_div.moveBefore(element, task_text)
                    }
                    task_project.classList.add("mie-2")
                }
                // Move project name to the right if it isn't there and preference is right
                if (index_text > index_project && preferences["project_location"]==1) {
                    for (let element of elements_to_move) {
                        task_div.moveBefore(element)
                    }
                    task_project.classList.add("mie-2")
                }
            }
        }
    }


    //----------------------

    function changeUpcomingURL() {
        //TODO
        return
        if (window.location.href.contains("/tasks/by/upcoming")) {
            let now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth();
            let day = now.getDay();

            window.location.href.replace("/upcoming", `/upcoming"?from=2026-01-01+00:00&to=2026-01-11+00:00&showOverdue=false&showNulls=false`);
        }
        
    }


    //----------------------

   
    function getCurrentMilliseconds() {
        const now = new Date();
        return now.toLocaleTimeString()+"."+now.getMilliseconds()
    }

    async function mutationHandler(mutationsList = [], observer) {
        log("Mutation Handler...",getCurrentMilliseconds(), mutationsList)

        for (const mutation of mutationsList) {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) { // make sure it's an element
                        const nestedTasks = node.querySelectorAll(".single-task");
                        if (nestedTasks.length && node.querySelectorAll(".task-project").length) {
                            log(`${nestedTasks.length} tasks with project loaded in a container`, getCurrentMilliseconds());
                            
                            log("Handling projects...");
                            handleMovingProject(nestedTasks);
                            handleProjectName(nestedTasks);


                            //TODO sometimes doesnt work on overview page

                            /*
                            //remove last viewed - TODO cleaner approach, couldnt detect it in mutationslist
                            var lastViewed = document.evaluate('//div[./*[contains(text(), "Last viewed")]]', document,null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
                            if (lastViewed) {
                                log("Removing lastViewed")
                                lastViewed.outerHTML = ""
                            }
                            */
    
                        }

                        // TODO this only works on reload :(
                        const settings_div = node.querySelectorAll(".general-settings");

                        if (settings_div.length) {
                            log("Settings page - Inserting UserScript Preferences");
                            addSettingsPanelForPreferences(settings_div[0]);
                        }
                    
                    }

                }
            }
        }     
    }

    function debounceDynamic(fn, defaultDelay) {
        let timer;
        let delay = defaultDelay;

        function debounced(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        }

        debounced.setDelay = (newDelay) => {
            delay = newDelay;
        };

        debounced.cancel = () => clearTimeout(timer);

        return debounced;
    }

    // shorter delay when URL changes
    const FAST_DELAY = 10;  
    const NORMAL_DELAY = 200;

    const debouncedHandler = debounceDynamic(mutationHandler, NORMAL_DELAY);

    const observer = new MutationObserver(mutations => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            loadProjects();     //reload projects when url changes
            changeUpcomingURL();

            // switch to fast debounce to catch early mutations
            debouncedHandler.setDelay(FAST_DELAY);
            debouncedHandler.cancel();  // reset pending timeout
            debouncedHandler();         // run immediately for new URL

            // then reset delay back to normal for subsequent mutations
            setTimeout(() => debouncedHandler.setDelay(NORMAL_DELAY), 500);
        } else {
            debouncedHandler(mutations);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
