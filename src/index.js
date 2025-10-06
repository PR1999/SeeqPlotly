import Plotly from 'plotly.js-dist-min'
import { Component, Mediator } from './components.js'
import { PlotlyPlot } from './plot.js';


let seeq;
let PLOT_AREA_ELEM = 'plotarea'
let debugmode = true;
let MEDIATOR;

devlog(QOTD())

function devlog(data) {
    if (debugmode) {
        console.log(data)
    }
}

document.addEventListener("DOMContentLoaded", function () {
    let plugin = new seeqPlugin();
    MEDIATOR = new Mediator();
    MEDIATOR.register(plugin);
    registerHandlers(plugin);
    let container = document.getElementById("firstcontainer")
    let height = container.clientHeight;
    let plotHeight = height*0.8
    let width = container.clientWidth;
    let plotWidth = width*0.8;
    let plot = new PlotlyPlot(PLOT_AREA_ELEM, {height : plotHeight, width: plotWidth});
    MEDIATOR.register(plot);

});

function registerHandlers(plugin) {
    getSeeqApi().then(_seeq => {
        seeq = _seeq;
        plugin.registerSeeq(seeq);
    });
}


class seeqPlugin extends Component {
    componentType = 'sqPlugin';
    initPromises = [];
    pluginInfo;
    seeq;
    workbook;
    worksheet;
    displayrange;
    signals = [];

    constructor() {
        super()
    }

    syncSignals(newsignals) {
        if (newsignals.toString() === this.signals.toString()) {
            return
        }
        this.signals = newsignals;
        this.mediator.notify({ type: 'SYNC_SIGNALS', value: this.signals });
        this.signals.forEach(s => {
            if ((s.dataStatus !== 'itemDataLoading') && (s.dataStatus !== 'itemDataPresent')) {
                devlog(`Loading: ${s.name} - ${s.dataStatus} - ${s.lastFetchRequest}`)
                this.loadSignal(s)
            } else {
                devlog(`Skipping: ${s.name} - ${s.dataStatus} - ${s.lastFetchRequest}`)
            }
        });
    }

    async loadSignal(signal) {
        if (this.displayrange === undefined) {
            return
        }
        let startDate = new Date(this.displayrange.start)
        startDate = startDate.toISOString();
        let endDate = new Date(this.displayrange.end)
        endDate = endDate.toISOString();
        let p = {
            start: startDate,
            end: endDate,
            formula: '$series',
            parameters: { series: signal.id },
            cancellationGroup: `cg${signal.id}`,
            limit: 100000
        }
        try {
            this.seeq.setTrendDataStatusLoading(signal.id);
            let results = await this.seeq.runFormula(p)

            this.seeq.setTrendDataStatusSuccess({
                id: signal.id,
                samples: results.data.samples.samples,
                timingInformation: results.info.timingInformation,
                meterInformation: results.info.meterInformation,
                valueUnitOfMeasure: signal.valueUnitOfMeasure,
                warningCount: results.data.warningCount,
                warningLogs: results.data.warningLogs
            });
            devlog(`Loaded: ${signal.name} - ${signal.dataStatus} - ${signal.lastFetchRequest} - ${results.data?.samples?.samples?.length} samples`)
            this.mediator.notify({ type: 'SIGNAL_DATA_UPDATE', value: { signal: signal, results: results } })
            return results
        } catch (error) {
            this.seeq.catchItemDataFailure(signal.id, `cg${signal.id}`, error.message)
        }
    }

    reloadSignals() {
        this.signals.forEach(s => {
            devlog(`Loading: ${s.name} - ${s.dataStatus} - ${s.lastFetchRequest}`)
            this.loadSignal(s)
        });
    }

    async formulaData(params, continuationToken = null) {
        if (continuationToken !== null) {
            p['continuationToken'] = continuationToken;
        }
        let res = await this.seeq.runFormula(p)
        return res
    }

    syncConditions(conditions) {
        devlog('syncConditions');
        devlog(conditions);
    }

    syncDisplayRange(newdisplayrange) {
        devlog(newdisplayrange);
        if (this.displayrange === newdisplayrange) {
            return
        }
        this.displayrange = newdisplayrange;
        this.reloadSignals()
    }

    registerSeeq() {
        devlog('Registering Plugin SEEQ API');
        this.seeq = seeq;
        this.registerInfo();
        this.registerToPlugin();
    }

    registerInfo() {
        devlog('Registering Plugin info');
        this.pluginInfo = seeq.pluginInfo;
        this.worksheet = seeq.worksheet;
        this.workbook = seeq.workbook;
    }

    registerToPlugin() {
        devlog('Registering Plugin Handlers ');
        this.seeq.subscribeToDisplayRange(this.init(displayrange => this.syncDisplayRange(displayrange)));
        this.seeq.subscribeToSignals(this.init(signals => this.syncSignals(signals)));
        this.seeq.subscribeToConditions(this.init(conditions => this.syncConditions(conditions)));
        Promise.all(this.initPromises).then(() => this.seeq.pluginRenderComplete());
    }

    init(func) {
        let resolve;
        this.initPromises.push(new Promise(r => { resolve = r; }));
        return (...args) => {
            func(...args);
            resolve();
        };
    }
}




function QOTD() {

    let QOTD = [
        'Before you ask more questions, think about whether you really want to know the answers.',
        'Do not believe in miracles -- rely on them.',
        'For fast acting relief, try slowing down.',
        'Nothing is as simple as it seems at first, or as hopeless as it seems in the middle, or as finished as it seems in the end.',
        'Ninety percent of everything is crap.',
        'The chief cause of problems is solutions.',
        'There are two reasons for doing anything; a good reason, and the real reason.',
        "Be incomprehensible. If they can't understand, they can't disagree.",
        'If you want divine justice, die.',
        'If you find a solution and become attached to it, the solution may become your next problem.',
        'It is not doing the thing we like to do, but liking the thing we have to do, that makes life blessed.',
        "Seeing is believing. You wouldn't have seen it if you hadn't believed it.",
        'All I ask of life is a constant and exaggerated sense of my own importance. ',
        "Apathy Club meeting this friday. If you want to come, you're not invited.",
        'Chairman of the Bored',
        'I\'d rather just believe that its done by little eleves running around..',
        'When you dont know what you are doing, do it neatly.',
        'Ignorance is when you dont know anything and somebody finds out.',
        'Do not try to solve all life\'s problems at once --- learn to dread each day as it comes.',
        'Do not believe everything you hear or anything you say.',
        'The average nutritional value of promises is roughly zero.'
    ];

    let i = Math.floor(Math.random() * QOTD.length)
    let quote = `Today's fortune reads ... '${QOTD[i]}'`
    return quote
}
