/**
* This script is part of a project aimed at european investors.
* Author: anonymous
* Email: sdonavan@tuta.io
* License: https://creativecommons.org/licenses/by-nc/2.0/
*/

/**
* A data provider Mixin.
* The data provider serves the purpouse of a frontend 'database'.
* When fed with a JSON file location with a specific file format,
* the Data provider returns an Array of country-metric data
*/
let DataProvider =
{
    data:
    {
        /**
        * The base for the Data Provider. Anything the provider adds
        * will be on top of this base
        **/
        countries:
        [
            {'name':'Albania'},
            {'name':'Austria'},
            {'name':'Belarus'},
            {'name':'Belgium'},
            {'name':'Bosnia and Herzegovina'},
            {'name':'Bulgaria'},
            {'name':'Croatia'},
            {'name':'Cyprus'},
            {'name':'Czech Republic'},
            {'name':'Denmark'},
            {'name':'Estonia'},
            {'name':'Finland'},
            {'name':'France'},
            {'name':'Germany'},
            {'name':'Greece'},
            {'name':'Hungary'},
            {'name':'Iceland'},
            {'name':'Ireland'},
            {'name':'Italy'},
            {'name':'Kosovo'},
            {'name':'Latvia'},
            {'name':'Liechtenstein'},
            {'name':'Lithuania'},
            {'name':'Luxembourg'},
            {'name':'FYR Macedonia'},
            {'name':'Malta'},
            {'name':'Moldova'},
            {'name':'Monaco'},
            {'name':'Montenegro'},
            {'name':'Netherlands'},
            {'name':'Norway'},
            {'name':'Poland'},
            {'name':'Portugal'},
            {'name':'Romania'},
            {'name':'San Marino'},
            {'name':'Serbia'},
            {'name':'Slovak Republic'},
            {'name':'Slovenia'},
            {'name':'Spain'},
            {'name':'Sweden'},
            {'name':'Switzerland'},
            {'name':'Ukraine'},
            {'name':'United Kingdom'},
            {'name':'Vatican'}]
    },

    methods:
    {
        /**
        * The main API point of the data provider.
        * When fed the input info it returns (through a callback) an array
        * of countries with the requested metric
        *
        * @param {File name} dataSource   A JSON file of the form
        *                                 data/gdp_ppp_per_capita.json
        * @param {Number}    year         The specific year we want the data from
        * @param {String}    relationship Can be one of the {'straight', 'reversed'}.
        *                                 This relationship decides if higher numbers
        *                                 of the metric are good (straight) or bad (reversed)
        *                                 so the data provider can calculate apropriate colors.
        * @param {Function}  cb           The callback.
        *
        * @return {Array}                 Returns an array of the form
        *                                 [{country: 'Austria', color: rgba, metric: 32} ..]
        *                                 Where the metric is the value in the provided JSON file
        *                                 (GDP, Unemployment, etc..) and the color represents
        *                                 how 'good' this metric is.
        */
        getData: function(dataSource, year, relationship, cb)
        {
            this.getDataFile(dataSource, data =>
            {
                // Create a new countries
                let countries = JSON.parse(JSON.stringify(DataProvider.data.countries))

                // Go through the data
                data.forEach(datum =>
                {
                    // Does the datum correspon to a country?
                    correspondingCountry = countries.find(c => c['name'] == datum['Country'])

                    // Calculate the metric
                    if(correspondingCountry)
                        correspondingCountry['metric'] = this.calculateMetricForYear(datum, year)

                    // Calculate any other stuff
                    if(correspondingCountry)
                        Object.keys(datum).forEach(k =>
                        {
                            // If not a number copy it
                            if (k && !Number(k))
                                correspondingCountry[k] = datum[k]
                        })
                })

                let allMetrics = countries.map(c => c['metric'])

                // Compute the color for the metric
                countries
                    .forEach(c => c['color'] = this.calculateColor(c['metric'], allMetrics, relationship))

                cb(countries)
            })
        },

        /**
        * Fetches a file and calls the callback. Duh.
        * @param   {String}   dataSource          A filename for the JSON file
        * @param   {Function} cb                  The callback function
        * @return  {Promise}                      A promise to fetch the files
        **/
        getDataFile: (dataSource, cb) => d3.json(dataSource, cb),

        /**
        * Given an Object of the form {country: CountryName, 1990: metric, 1991: metric...}
        * creates a new object of the form {name: CountryName, metric: metricForYear}
        * @param   {Object} country    As defined in data/in gdp_ppp_per_capita.json
        * @param   {Number} year       The year we are interested in
        * @return  {Number}            The value of the metric for the given year
        **/
        calculateMetricForYear(country, year)
        {
            let name = country['Country']

            let metric = (country[year] === undefined || country[year] ==='n/a' || country[year] === 'n/a' || country[year] === '')
                ? undefined
                : Number(String(country[year]).replace(',', ''))

            return metric
        },

        /**
        * Calculates an apropriate color for a metric. For instance for an array of
        * [1, 2, 3, 4, 5] it would calculate the apropriate color for '3' as being
        * in the middle of a color-spectrum, 5 at the high end and 1 at the low.
        * @param   {Number} metric            A metric
        * @param   {Array}  allNumbers        An array of the type of @country
        * @return  {String}                     An rgba color
        **/
        calculateColor(metric, allNumbers, relationship)
        {
            // Return default color
            if (metric === undefined)
                return 'rgb(180, 180, 180)'

            // Get an array of all the defined metrics
            let metrics =
                allNumbers
                .filter(m => typeof m == 'number')

            // Calculate the color
            let minValue = Math.min.apply(Math, metrics),
                maxValue = Math.max.apply(Math, metrics),
                restrictedValue = this.rangeConverter(metric, minValue, maxValue, 0, 1),
                trueRestrictedValue = (relationship !== 'reversed') ? restrictedValue/ 2 : (1 - restrictedValue)/ 2
                rgb = this.hslToRgb(trueRestrictedValue, 0.5, 0.5)

            return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')'
        },

        /**
        * Convert a number in a range to a number in a different range,
        * for example 3 in the range 1 - 10 will be converted to 30 in the range
        * 1 - 100
        * @param   {number}  oldValue The input value
        * @param   {number}  oldMin   The lower bound of the input range
        * @param   {number}  oldMax   The upper bound of the input range
        * @param   {number}  newMin   The lower bound of the output range
        * @param   {number}  newMax   The upper bound of the output range
        * @return  {number}           The new calculcated number
        **/
        rangeConverter: (oldValue, oldMin, oldMax, newMin, newMax) => (oldValue - oldMin) / (oldMax - oldMin) * (newMax - newMin) + newMin,

        /**
        * Converts an HSL color value to RGB. Conversion formula
        * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
        * Assumes h, s, and l are contained in the set [0, 1] and
        * returns r, g, and b in the set [0, 255].
        *
        * @param   {number}  h       The hue
        * @param   {number}  s       The saturation
        * @param   {number}  l       The lightness
        * @return  {Array}           The RGB representation
        */
        hslToRgb: function(h, s, l)
        {
            let r, g, b

            if(s == 0)
                r = g = b = l // achromatic
            else
            {
                let hue2rgb = (p, q, t) =>
                {
                    if(t < 0) t += 1
                    if(t > 1) t -= 1
                    if(t < 1/6) return p + (q - p) * 6 * t
                    if(t < 1/2) return q
                    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6
                    return p
                }

                let q = l < 0.5 ? l * (1 + s) : l + s - l * s
                let p = 2 * l - q
                r = hue2rgb(p, q, h + 1/3)
                g = hue2rgb(p, q, h)
                b = hue2rgb(p, q, h - 1/3)
            }

            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        },

        formatNumber: num => (num >= 1000) ? (num / 1000).toFixed(1) + 'K' : num
    }
}
