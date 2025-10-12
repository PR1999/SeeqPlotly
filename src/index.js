import Plotly from 'plotly.js-dist-min'
import { Component, Mediator, Button, DropdownSelector } from './components.js'
import { PlotlyPlot } from './plot.js';


let seeq;
let PLOT_AREA_ELEM = 'plotarea'
let debugmode = false;
let MEDIATOR;
let iconselect = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Pro v5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path d="M505 174.8l-39.6-39.6c-9.4-9.4-24.6-9.4-33.9 0L192 374.7 80.6 263.2c-9.4-9.4-24.6-9.4-33.9 0L7 302.9c-9.4 9.4-9.4 24.6 0 34L175 505c9.4 9.4 24.6 9.4 33.9 0l296-296.2c9.4-9.5 9.4-24.7.1-34zm-324.3 106c6.2 6.3 16.4 6.3 22.6 0l208-208.2c6.2-6.3 6.2-16.4 0-22.6L366.1 4.7c-6.2-6.3-16.4-6.3-22.6 0L192 156.2l-55.4-55.5c-6.2-6.3-16.4-6.3-22.6 0L68.7 146c-6.2 6.3-6.2 16.4 0 22.6l112 112.2z"/></svg>`

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
    let dimButton = new Button('dimBtn', 'dimBtn', 'toolbar', 'DIM_BTN_CLICK', 'Dimming', iconselect,false);
    MEDIATOR.register(dimButton);
    let boxButton = new Button('boxBtn', 'boxBtn', 'toolbar', 'BOX_BTN_CLICK', 'Boxplot', iconselect, true);
    MEDIATOR.register(boxButton);
    let pointsDropdown = new DropdownSelector('pointsSelector', 'toolbar', 'pointsSelector', 'POINTS_SELECT_CHANGE', [{text: 'None', value:'none', eventValue:false},{text: 'All', value:'all', eventValue:'all'}, {text: 'Outliers', value:'outliers', eventValue:'outliers'}, {text: 'Suspected outliers', value:'suspectedoutliers', eventValue:'suspectedoutliers'}])
    MEDIATOR.register(pointsDropdown);
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
            //let results = await this.seeq.runFormula(p)
            let results = await this.getFormulaData(p);

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
        //Seeq never implemented support for continuation tokens in the plugin api. Leaving it in case they ever do.
        if (continuationToken !== null) {
            params['continuationToken'] = continuationToken;
        }
        let res = await this.seeq.runFormula(params)
        return res
    }

    async getFormulaData(params){
        let allSamples = []
        let complete = false
        let nexttoken = null
        let lastresult;
        let originalStart = params.start
        while((!complete)) {
            let res = await this.formulaData(params, nexttoken)
            complete = (res.data.samples.continuationToken === null || res.data.samples.continuationToken === undefined)
            nexttoken = res.data.samples.continuationToken
            allSamples.push(...res.data.samples.samples)
            lastresult = res
            //this is a workaround! I modify startdate if there is a continuation token, because tokens are not implemented for the plugin api.
            if (res.data.metadata["Key Unit Of Measure"] == 'ns'){
                let nextStart = allSamples[allSamples.length - 1].key
                nextStart = Math.ceil(nextStart / 1000000)
                let nextStartDate = new Date(nextStart)
                let nextStartStr = nextStartDate.toISOString()
                params.start = nextStartStr
            } else {
                complete = true;
                throw new Error(`data exceeded limit of ${params.limit} for ${params.series}`)
            }
        }
        lastresult.data.samples.samples = allSamples;
        return lastresult;
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

    syncInvestigationRange(e){
        devlog('sync investigation range');
        devlog(e);
    }

    syncCurrentWorkstep(e){
        devlog('sync workstep');
        devlog(e);

    }

    syncScalars(e){
        devlog('sync scalars');
        devlog(e);

    }

    syncMetrics(e){
        devlog('sync metrics');
        devlog(e);
    }

    syncTables(e){
        devlog('sync tables');
        devlog(e);

    }

    syncPluginState(e){
        devlog('sync plugin state');
        devlog(e);
    }

    syncCapsules(e){
        devlog('sync capsules');
        devlog(e);
    }
    
    syncSelectedCapsules(e){
        devlog('sync selected capsules');
        devlog(e);
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
        this.seeq.subscribeToInvestigationRange(this.init(e => this.syncInvestigationRange(e)));
        this.seeq.subscribeToCurrentWorkstep(this.init(e => this.syncCurrentWorkstep(e)));
        this.seeq.subscribeToPluginState(this.init(e => this.syncPluginState(e)));
        this.seeq.subscribeToSignals(this.init(signals => this.syncSignals(signals)));
        this.seeq.subscribeToConditions(this.init(conditions => this.syncConditions(conditions)));
        this.seeq.subscribeToCapsules(this.init(e => this.syncCapsules(e)));
        this.seeq.subscribeToSelectedCapsules(this.init(e => this.syncSelectedCapsules(e)));
        this.seeq.subscribeToMetrics(this.init(e => this.syncMetrics(e)));
        this.seeq.subscribeToTables(this.init(e => this.syncTables(e)));
        this.seeq.subscribeToScalars(this.init(e => this.syncScalars(e)));
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
