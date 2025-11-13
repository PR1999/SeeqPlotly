import { Component } from "./components";

/**
 * class for interacting with the seeq web api and other components
 * @extends Component 
 * @property {boolean} debugmode
 * @property {Promise[]} initPromises
 * @property {object} seeq
 * @property {object} workbook
 * @property {object} worksheet
 * @property {object} displayrange
 * @property {object[]} signals
 */
class seeqPlugin extends Component {
    componentType = 'sqPlugin';
    debugmode =false;
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
    /** dev logs, unless disabled by debugmode */
    devlog(data) {
    if (this.debugmode) {
        console.log(data)
    }
}
    /** seeq signals event handler */
    syncSignals(newsignals) {
        this.signals = newsignals;
        this.mediator.notify({ type: 'SYNC_SIGNALS', value: this.signals });
        this.signals.forEach(s => {
            if ((s.dataStatus !== 'itemDataLoading') && (s.dataStatus !== 'itemDataPresent')) {
                this.devlog(`Loading: ${s.name} - ${s.dataStatus} - ${s.lastFetchRequest}`)
                this.loadSignal(s)
            } else {
                this.devlog(`Skipping: ${s.name} - ${s.dataStatus} - ${s.lastFetchRequest}`)
            }
        });
    }
    /** loads signal data for current display range*/
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
            this.devlog(`Loaded: ${signal.name} - ${signal.dataStatus} - ${signal.lastFetchRequest} - ${results.data?.samples?.samples?.length} samples`)
            this.mediator.notify({ type: 'SIGNAL_DATA_UPDATE', value: { signal: signal, results: results } })
            return results
        } catch (error) {
            this.seeq.catchItemDataFailure(signal.id, `cg${signal.id}`, error.message)
        }
    }
    /** reload all signals */
    reloadSignals() {
        this.signals.forEach(s => {
            this.devlog(`Loading: ${s.name} - ${s.dataStatus} - ${s.lastFetchRequest}`)
            this.loadSignal(s)
        });
    }

    /** runs formula with the specified parameters @param {object} params @param {string} [continuationToken=null] */
    async formulaData(params, continuationToken = null) {
        //Seeq never implemented support for continuation tokens in the plugin api. Leaving it in case they ever do.
        if (continuationToken !== null) {
            params['continuationToken'] = continuationToken;
        }
        let res = await this.seeq.runFormula(params)
        return res
    }
    /** runs a formula with the specified parameters @param {objects} params */
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
        this.devlog('syncConditions');
        this.devlog(conditions);
    }

    /**
     * handles display range events - sets new display range and calls reload signals
     * @param {} newdisplayrange 
     */
    syncDisplayRange(newdisplayrange) {
        this.devlog(newdisplayrange);
        if (this.displayrange === newdisplayrange) {
            return
        }
        this.displayrange = newdisplayrange;
        this.reloadSignals()
    }

    syncInvestigationRange(e){
        this.devlog('sync investigation range');
        this.devlog(e);
    }

    syncCurrentWorkstep(e){
        this.devlog('sync workstep');
        this.devlog(e);

    }

    syncScalars(e){
        this.devlog('sync scalars');
        this.devlog(e);

    }

    syncMetrics(e){
        this.devlog('sync metrics');
        this.devlog(e);
    }

    syncTables(e){
        this.devlog('sync tables');
        this.devlog(e);

    }

    syncPluginState(e){
        this.devlog('sync plugin state');
        this.devlog(e);
    }

    syncCapsules(e){
        this.devlog('sync capsules');
        this.devlog(e);
    }
    
    syncSelectedCapsules(e){
        this.devlog('sync selected capsules');
        this.devlog(e);
    }

    /**registers seeq api object with this plugin object @param {*} seeq */
    registerSeeq(seeq) {
        this.devlog('Registering Plugin SEEQ API');
        this.seeq = seeq;
        this.registerInfo();
        this.registerToPlugin();
    }

    /** sets plugin info, workbook, and worksheet */
    registerInfo() {
        this.devlog('Registering Plugin info');
        this.pluginInfo = this.seeq.pluginInfo;
        this.worksheet = this.seeq.worksheet;
        this.workbook = this.seeq.workbook;
    }

    /**subscribes plugins handlers to seeq events */
    registerToPlugin() {
        this.devlog('Registering Plugin Handlers ');
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
    /** wraps function in a promise and pushes to initPromises,  resolves promise once the function has ran @param {function} func*/
    init(func) {
        let resolve;
        this.initPromises.push(new Promise(r => { resolve = r; }));
        return (...args) => {
            func(...args);
            resolve();
        };
    }
}

export {seeqPlugin}