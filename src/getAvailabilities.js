import moment from 'moment'
import knex from 'knexClient'

Date.prototype.addDays = function(days) {
	let date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
}

/*ASSUMPTIONS:
- Data was input without errors - no appts where not openings
- not overbooked - no more than 1 appointment at one time
- weekly recurring openings have no "end date"
*/

export default async function getAvailabilities(date) {
  //db 'events': {kind: str, starts_at: date, ends_at: date, weekly_recurring: bool}
  //returns array of objects {date, slots[]}

  let openings = {};
  let appts = {};


  //set incoming to midnight
  date.setHours(24,0,0,0);  


  //end date is up to midnight 7 days later
  let endDate = date.addDays(7);
  endDate.setHours(23,59,59,59);
  

  //date time formatter -- we will use this to group all slots by this date format
  function formatDate(d, part) {
  	const dte = new Date(d);
  	let dateStr = new Date(dte.getTime() - (dte.getTimezoneOffset() * 60000 ))
                    .toISOString()
                    .split("T");
    let date = dateStr[0];
    let time = dateStr[1][0] == "0" ? dateStr[1].substr(1, 4) : dateStr[1].substr(0, 5);
  	if (part == 'date') return date;
  	if (part == 'time') return time;
  	return `${date} ${time}`;
  }


  //function to find applicable day on recurring entries
  function getRepeatDate(d, start) {
  	let dte = new Date(d);
    while (dte.valueOf() < start.valueOf()) {  	
     dte = dte.addDays(7);
    }
    return dte;
  }



   //get data
   //look for starts_at between our two dates
   //plus add in all the recurring that have already started
   return knex.raw(`SELECT * from events 
   	         WHERE ((starts_at <= ? AND weekly_recurring = ?)
   	         OR ((starts_at between ? and ?) 
   	         OR (ends_at between ? and ?))
   	         ) 
   	         ORDER BY starts_at`, [endDate, true, date, endDate, date, endDate])
   .then((rows) => {
   	  rows.map(row => {

   	  	let obj = (row.kind == 'opening' ? openings : appts);
        
   	  	//build the slots
   	  	let slots = buildSlots(row.starts_at, row.ends_at);
        let rowDateStr = formatDate(row.starts_at, 'date');

   	  	//if already there just add slots
        if (obj.hasOwnProperty(rowDateStr)) {
   	  	 obj[rowDateStr] = obj[rowDateStr].concat(slots);
   	  	 //careful not to add rows not within our date range (repeaters)
        } else if (row.starts_at >= date) {
         obj[rowDateStr] = slots;
        }

   	  	//if this is recurring add another row for this date
   	  	if (row.weekly_recurring && row.starts_at < date) {
   	  	    let thisWeekStr = formatDate(getRepeatDate(row.starts_at, date), 'date');
   	  	    //if already there just add slots
		        if (obj.hasOwnProperty(thisWeekStr)) {
		   	  	 obj[thisWeekStr] = obj[thisWeekStr].concat(slots);
		        } else {
		         obj[thisWeekStr] = slots;
		        }
        }
   	  })
   })
   .then(() => {
   	  let avail = buildAvailability();
   	  return avail;
   })
   .catch(err => { console.log(err); throw err})



   function buildSlots(startTime, endTime) {
   	  const HALFHOUR = 30 * 60000;
   	  let start = startTime;
   	  let slots = [];
   	  //every half hour between times not including endTime
      while (start < endTime) { 
        slots.push(formatDate(start, 'time'));
        start = start + HALFHOUR;
      }
      return slots;
   }
   
   function buildAvailability() {
   	 let availability = [];
     for (let d = 0; d < 7; d++) {
     	let slots = [];
     	let slotDate = new Date(date.addDays(d));
     	let day = formatDate(slotDate, 'date');
      if (openings[day]) {
      	slots = openings[day];
      	//remove any slots booked
      	if (appts[day]) {
      	  slots = slots.filter((el)=> {
      	  	return !appts[day].includes(el);
      	  })
      	}
      }
      availability.push({date: new Date(day), slots: slots});
     }//end for
     // console.log("openings", openings);
     //  console.log("appts", appts);
     // console.log('availability: ', availability);

     return availability;
   }


}
