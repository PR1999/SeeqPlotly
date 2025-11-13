/**
 * registers and keeps track of components
 * @property {Component[]} components
 * @property {boolean} logging
 */
class Mediator {

    components = [];
    logging = true;
    
    constructor() {
    }

    /**
     * registers a component to this mediator.
     * @param {Component} component 
     */
    register(component) {
        component.setMediator(this)
        this.components.push(component);
        if (this.logging) {
            console.log(`MEDIATOR:\tregistered: ${component?.componentType}\t\t${this.components.length} components are registered`)
        }
    }

    /**
     * logs event to console, unless log property of event is false or logging is disabled.
     * @param {mediatorEvent} e 
     */
    log(e) {
        if (this.logging && e?.log!==false) {
        console.log(`EVENT:\t${e.type}\t${e?.value}`);
        }
    }

    /**
     * notifies each registered component of an event
     * @param {mediatorEvent} e 
     */
    notify(e) {
    this.log(e);
    this.send_event(e);
    }

    /**
     * calls listen for each of this mediators components
     * @param {mediatorEvent} e 
     */
    send_event(e) {
        this.components.forEach(component => {
            component.listen(e);
        })
    }
}

/**
 * Generic component class
 * @property {string} componentType
 */
class Component {
    componentType = 'Component';
    constructor() {

    }
    /**
     * @param {Mediator} mediator 
     */
    setMediator(mediator) {
        this.mediator = mediator;
    }

    /**
     * @param {mediatorEvent} e 
     */
    listen(e) {

    }
}

/**
 * class representing html button element @extends Component
 * @property {string} parentEl - id of parent element 
 * @property {string} elementId
 * @property {string} eventIdentifier
 * @property {boolean} state
 */
class Button extends Component {
    componentType = 'Button';
    parentEl;
    elementId;
    eventIdentifier;
    state = false;

    /**
     * @param {string} name 
     * @param {string} elementId 
     * @param {string} parentEl 
     * @param {string} eventIdentifier 
     * @param {string} [text=''] 
     * @param {string} [icon='']
     * @param {boolean} [initialState=false] 
     */
    constructor(name, elementId, parentEl, eventIdentifier, text = '', icon='', initialState=false ) {
        super();
        this.name = name;
        this.parentEl = parentEl;
        this.elementId = elementId;
        this.eventIdentifier = eventIdentifier;
        this.state = initialState
        let btnEl = document.createElement('button')
        btnEl.id = this.elementId;
        btnEl.innerHTML = `${icon} <p>${text}</p>`;
        btnEl.addEventListener('click', (e)=> this.handle_click(e));
        if (this.state) {
            btnEl.classList.add('active');
        }
        let parent = document.getElementById(parentEl);
        parent.appendChild(btnEl);
    }

    /** Handle button click */
    handle_click(){
        this.state = !(this.state);
        let btnEl = document.getElementById(this.elementId);
        if (this.state) {
            btnEl.classList.add('active');
        } else {
            btnEl.classList.remove('active')
        }
            
        let myEvent = {
            type: this.eventIdentifier,
            value: this.state
        }
        this.mediator.notify(myEvent);
    }
}

/** Represents dropdown element @extends Component */
class DropdownSelector extends Component{
    componentType = 'DropdownSelector';
    /**
     * 
     * @param {string} name 
     * @param {string} parentEl 
     * @param {string} elementId 
     * @param {string} eventidentifier
     * @param {object[]} data 
     * @prop {string} data.text - display text
     * @prop {string} data.value - unique identifier for HTML and event identifier
     * @prop {any} data.eventValue - to send with event 
     */
    constructor(name, parentEl, elementId, eventidentifier, data) {
        super();
        this.name = name;
        this.parentEl = parentEl;
        this.elementId = elementId;
        this.eventidentifier = eventidentifier
        let textlist = data.map(opt => opt.text);
        let valuesList = data.map(opt => opt.value);
        this.dataMap = new Map(data.map(opt => [opt.value, opt.eventValue]))
        let selectEl = this.createSelectElement(textlist, name, elementId, valuesList);
        selectEl.addEventListener('change', (e)=> this.handle_select_change(e));
        let parent = document.getElementById(parentEl);
        parent.appendChild(selectEl);
    }
    /**
     * handles change events
     * @param {Event} e 
     */
    handle_select_change(e) {
        let selectedValue = e.currentTarget.value
        
        let myevent = {
            type : this.eventidentifier,
            value : this.dataMap.get(selectedValue)
        }

        this.mediator.notify(myevent);
    }
    /**Update dropdown with new calues and data 
     * @param {object[]} data 
     * @prop {string} data.text - display text
     * @prop {string} data.value - unique identifier for HTML and event identifier
     * @prop {any} data.eventValue - to send with event 
     */
    update_data(data) {
        let textlist = data.map(opt => opt.text);
        let valuesList = data.map(opt => opt.value);
        this.dataMap = new Map(data.map(opt => [opt.value, opt.eventValue]))
        let selectEl = this.createSelectElement(textlist, this.name, this.elementId, valuesList);
        selectEl.addEventListener('change', (e)=> this.handle_select_change(e));
        let parent = document.getElementById(this.parentEl);
        let old = document.getElementById(this.elementId);
        parent.replaceChild(selectEl, old);
    }

/**
 * Creates select element
 * @param {string[]} list - list of display text
 * @param {string} name - select element name
 * @param {string} id - element id
 * @param {string} values - html event value
 * @returns {HTMLSelectElement}
 */
    createSelectElement(list, name, id, values = []) {
        let selectElem = document.createElement('select');
        selectElem.setAttribute('name', name);
        selectElem.id = id;
        list.forEach((option, i) => {
            if (option !== 0) {
                let optionElem = document.createElement('option');
                if (values.length > 0 && (list.length === values.length)) {
                    optionElem.setAttribute('value', values[i]);
                } else {
                    optionElem.setAttribute('value', option);
                }
                optionElem.innerText = option;
                selectElem.appendChild(optionElem);
            }
        });
        return selectElem;
    }
}

export {Mediator, Component, Button, DropdownSelector}