/**
* The app is going to serve the purpouse of a router
**/
let app = new Vue({

    el: '#content',

    data:
    {
        page:   'valuations',
        valuation: 'GDP PPP Per Capita'
    },

    mounted: function()
    {
        // Set the correct page
        this.page = window.location.hash.replace('#', '')
    },

    computed:
    {
        valuationName: function()
        {
            let currentOption = this.$el.querySelector('.submenu input[value ="' + this.page + '"]')
            return currentOption ? currentOption.parentNode.innerText : 'N/A'
        }
    },

    watch:
    {
        page: function(newPage)
        {
            // Save the current page
            window.location.hash = newPage
        }
    }
})
