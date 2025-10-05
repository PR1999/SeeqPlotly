
import Plotly from 'plotly.js-dist-min'


let seeq;
let PLOT_AREA_ELEM = 'plotarea'
let debugmode = true;

function devlog(data) {
    if (debugmode) {
        console.log(data)
    }
}

document.addEventListener("DOMContentLoaded", function() {
    let plugin = new seeqPlugin();
    registerHandlers(plugin);
    initPlotlyPlot(PLOT_AREA_ELEM);

});

function registerHandlers(plugin) {
    getSeeqApi().then(_seeq => {
        seeq = _seeq;
        plugin.registerSeeq(seeq);
    });
}


class seeqPlugin {
    initPromises = [];
    pluginInfo;
    seeq;
    workbook;
    worksheet;
    displayrange;

    constructor() {

    }
    syncSignals(signals) {
        devlog('syncSignals');
        devlog(signals);
        signals.forEach(s => {
            this.seeq.setTrendDataStatusLoading(s.id);
            this.loadSignal(s)
        });
    }

    async loadSignal(signal) {
        if (this.displayrange===undefined) {
            return
        }
        let startDate = new Date(this.displayrange.start)
        startDate = startDate.toISOString();
        let endDate = new Date(this.displayrange.end)
        endDate = endDate.toISOString();
        let p = {
                start : startDate,
                end : endDate,
                formula : '$series',
                parameters : {series : signal.id},
                cancellationGroup : `cg${signal.id}`
        }
        try {
            let results = await this.seeq.runFormula(p)
            devlog(results)
            return results

        } catch (error) {
            this.seeq.catchItemDataFailure(signal.id, `cg${signal.id}`, error )
        }

    }

    syncConditions(conditions) {
        devlog('syncConditions');
        devlog(conditions);
    }

    syncDisplayRange(newdisplayrange) {
        devlog(newdisplayrange);
        this.displayrange = newdisplayrange;
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
        this.seeq.subscribeToSignals(this.init(signals => this.syncSignals(signals)));
        this.seeq.subscribeToConditions(this.init(conditions => this.syncConditions(conditions)));
        this.seeq.subscribeToDisplayRange(this.init(displayrange => this.syncDisplayRange(displayrange)));
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

function initPlotlyPlot(elementId) {
    let data = [];
    let layout = {
        showlegend: false,
        width: 600,
        height: 400,
        autosize: true
    };
    Plotly.newPlot(elementId, data, layout, { scrollZoom: true, responsive: true, modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d'], displaylogo: false });
}
