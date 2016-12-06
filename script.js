/**
* A map component
**/
Vue.component('map-timeline',
{
    props: ['metricsource', 'year', 'metricRelationship'],

    template: '<div style = "width: 100%; height: 600px;"></div>',

    mounted: function()
    {
        this.year = 2016
        this.drawMap(this.$el, this.metricsource, 'countries.json')
    },

    methods:
    {
        /**
        * Draws a map of all european countries and colors them accordingly given
        * a specific metric
        * @param   {DOMNode}  element         A container element to draw to
        * @param   {String}   metricSource    A filename for the JSON file containing the metrics
        * @param   {String}   countriesSource A filename for the JSON file containing the countries
        * @return  {void}
        **/
        drawMap: function(element, metricSource, countriesSource)
        {
            let w = this.$el.offsetWidth
            let h = this.$el.offsetHeight

            let projection = d3
                .geoMercator() //utiliser une projection standard pour aplatir les pôles, voir D3 projection plugin
                .center([ 13, 52 ]) //comment centrer la carte, longitude, latitude
                .translate([ w/2, h/2 ]) // centrer l'image obtenue dans le svg
                .scale([ w/1.8 ]) // zoom, plus la valeur est petit plus le zoom est gros

            //Define path generator
            let path = d3
                .geoPath()
                .projection(projection)


            //Create SVG
            let svg = d3
                .select(this.$el)
                .append("svg")
                .attr("width", w)
                .attr("height", h)

            // Load the metric and countries file
            d3.json(metricSource, metric => d3.json(countriesSource,json =>
            {
                // Save the metric without tons of async mambo-jambo
                this.metric = metric
                let mapId = Math.random()

                //Bind data and create one path per GeoJSON feature
                svg
                    .selectAll("path")
                    .data(json.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("stroke", '#dddddd')
                    .attr("fill", this.calculateColor)
                    .attr("id", (d, i) => '#path_' + i)

                svg
                    .selectAll('rect')
                    .data(json.features)
                    .enter()
                    .filter(this.calculateMetricForYear)
                    .append("rect")
                    .attr('fill', this.calculateColor)
                    .attr("x", d => path.centroid(d)[0] - 3.5)
                    .attr('y', d => path.centroid(d)[1] - 10)
                    .attr('width', '30px')
                    .attr('height', '14px')

                // Draw the labels
                svg
                    .selectAll("text")
                    .data(json.features)
                    .enter()
                    .filter(this.calculateMetricForYear)
                    .append("text")
                    .text(this.calculateLabel)
                    .attr("x", d => path.centroid(d)[0])
                    .attr('y', d => path.centroid(d)[1])
                    .attr('title', d => d.properties.admin)
            }))
        },

        /**
        * Given a feature object calculate the metric value for the
        * given year
        * @param   {d}                A feature object as defined in countries.json
        * @return  {number}           A number representing the metric value
        **/
        calculateMetricForYear(d)
        {
            let countryName = d.properties.admin,
                country     = this.metric.find(m => m.Country == countryName),
                thisYear = country && country[this.year]
                valueForCountryForYear = (typeof thisYear === 'string') ? Number(thisYear.replace(',', '')) : thisYear

            if (typeof valueForCountryForYear == 'number')
                return valueForCountryForYear
            else
                return undefined
        },

        /**
        * Given a feature input of the form in countries.json, which includes a
        * countru name calculates a decent label
        * @param   {d}                A feature object as defined in countries.json
        * @return  {String}           The label for the specific metric
        **/
        calculateLabel: function(d)
        {
            let metric = this.calculateMetricForYear(d)

            if (typeof metric == 'number' && metric >= 1000)
                return (this.calculateMetricForYear(d) / 1000).toFixed(1) + 'K'
            if (typeof metric == 'number')
                return metric

            // Default to N/A
            return 'N/A'
        },

        /**
        * Given a feature input of the form in countries.json, which includes a
        * countru name calculate a representitive color for the value of the
        * metric of the said country in the predefined year.
        * The value is calculated dynamically given the distribution of the metric,
        * with values closer to the distribution Supremum having higher Hue
        * in a HLS color notation.
        * @param   {d}                A feature object as defined in countries.json
        * @return  {String}           A css rgba color string
        **/
        calculateColor: function(d)
        {
            // Try to find the metric value for the country in the selected year
            valueForCountryForYear = this.calculateMetricForYear(d)

            // If no value exists for the given year, return a default color
            if(!valueForCountryForYear)
                return 'rgb(188, 188, 188)'

            // Get min and max data for the year. Could be run outside of the function,
            // but "premature optimization yada yada.."
            let AllYearlyData = this.metric
                .map(m => m[this.year])
                .filter(m => m !== 'undefined' && m !== '')
                .map(m => (typeof m == 'string') ? m.replace(',', '') : m)
                .map(m => Number(m))
                .filter(m => !isNaN(m))

            let minValue = Math.min.apply(Math, AllYearlyData),
                maxValue = Math.max.apply(Math, AllYearlyData),
                restrictedValue = this.rangeConverter(valueForCountryForYear, minValue, maxValue, 0, 1),
                trueRestrictedValue = (this.metricRelationship !== 'reversed') ? restrictedValue/ 2 : (1 - restrictedValue)/ 2
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
        }

    }
})

let app = new Vue({el: '#content', data:{page: 'valuations'}})
