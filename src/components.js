class Mediator {

    components = [];
    logging = true;
    
    constructor() {
    }

    register(component) {
        component.setMediator(this)
        this.components.push(component);
        if (this.logging) {
            console.log(`MEDIATOR:\tregistered: ${component?.componentType}\t\t${this.components.length} components are registered`)
        }
    }

    log(e) {
        if (this.logging && e?.log!==false) {
        console.log(`EVENT:\t${e.type}\t${e?.value}`);
        }
    }

    notify(e) {
    this.log(e);
    this.send_event(e);
    }

    send_event(e) {
        this.components.forEach(component => {
            component.listen(e);
        })
    }
}

class Component {
    componentType = 'Component';
    constructor() {

    }

    setMediator(mediator) {
        this.mediator = mediator;
    }

    listen(e) {

    }
}

class Button extends Component {
    componentType = 'Button';
    parentEl;
    elementId;
    eventIdentifier;
    state = false;
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

    handle_select_change(e) {
        let selectedValue = e.currentTarget.value
        
        let myevent = {
            type : this.eventidentifier,
            value : this.dataMap.get(selectedValue)
        }

        this.mediator.notify(myevent);
    }

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