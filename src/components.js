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
    constructor(name, elementId, parentEl, eventIdentifier, text = '', icon='' ) {
        super();
        this.name = name;
        this.parentEl = parentEl;
        this.elementId = elementId;
        this.eventIdentifier = eventIdentifier
        let btnEl = document.createElement('button')
        btnEl.id = this.elementId;
        btnEl.innerHTML = `${icon} <p>${text}</p>`;
        btnEl.addEventListener('click', (e)=> this.handle_click(e));
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

export {Mediator, Component, Button}