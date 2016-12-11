/**
* A chain of companies /countries etc. witholding taxes
*/
Vue.component('witholding-chain',
{
    props: ['participants', 'capital'],

    template: `
                <div class = "witholding-chain">
                    <div v-for = "p in parsedParticipants">

                        <div class = "witholder">

                            <div class ="icon-group">
                                <img v-for = "i in p.icons" v-bind:src = '"icons/" + i + ".png"'>
                            </div>

                            <span class ="witholded" v-if = "p.witholded !== null">{{Math.round(p.witholded * 100) / 100}}€</span>
                        </div>

                        <span v-if ='p != parsedParticipants[parsedParticipants.length - 1]'>---{{Math.round(p.money * 100) / 100}}€---></span>
                    </div>
                </div>`,

    computed:
    {
        /**
        * Converts a string of the type: 'icon1:icon2:icon3(amount), icon1(amount) ...'
        * into an apropriate Array of objects of the type {icons[icon1, icon2], money: MONEY witholded: WITHOLDED}
        *
        * @return  {Array}                   Array of objects of the type {icons[icon1, icon2], money: MONEY witholded: WITHOLDED}
        * @return  {Array}:Object:MONEY      The total money the individual participant in the chain has. The default start is 1
        * @return  {Array}:Object:WITHOLDED  The amount of the money witholded. The rest of the money is passed down the chain.
        */
        parsedParticipants: function ()
        {
            // If the start capital is not defined, set it to 1
            let money = this.capital && Number(this.capital) || 1.00

            // Parse the participants
            return this.participants.replace(/ /g,'').split(',').map(participant =>
            {
                let witholdedExp = /\(([^)]+)\)/

                let witholded = witholdedExp.exec(participant) && witholdedExp.exec(participant)[1]

                // Calculate the witholded sum
                if (Number(witholded))
                    witholded = Number(witholded)
                if (witholded == 'all')
                    witholded = money

                money -= witholded
                return {icons: participant.replace(witholdedExp, '').split(':'), witholded, money}
            })
        }
    }
})
