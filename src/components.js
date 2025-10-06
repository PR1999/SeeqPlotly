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

export {Mediator, Component}