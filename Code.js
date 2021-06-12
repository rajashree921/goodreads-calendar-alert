let debug = false;
let firstWeekOfMonth = false;
let today = new Date();
let ss = SpreadsheetApp.openById(
    "1dXbvJc9i1KoiMUaTNukCYX9DS8oGmyznnXsZe4-BFZM"
  ),
  sheet = ss.getSheets()[0];

function fetchGoodreadsData(params) {
  let apiUrl = "https://www.goodreads.com/review/list?v=2";
  return UrlFetchApp.fetch(apiUrl, params);
}

//should probably change this function's name
function checkData(book) {
  let title = book.getChild("title").getText(),
    // titleWithoutSeries = book.getChild("title_without_series").getText(),
    author = book
      .getChild("authors")
      .getChild("author")
      .getChild("name")
      .getText(),
    link = book.getChild("link").getText();
    // title = title.concat(" - ", author);
    //check whether event already exists for the book
    //if yes, then remove sheet entry if it exists
  if (calendarEventExists(title)) removeSheetEntry(title);
  else {
    //check whether publication date values are filled in
    if (book.getChild("publication_day").getText()) {
      let pubDate = new Date(
        book.getChild("publication_year").getText(),
        book.getChild("publication_month").getText() - 1,
        book.getChild("publication_day").getText()
      );
      //check whether book has a future release date
      //check whether event already exists for the book
      //if yes, then do nothing
      //otherwise create calendar event and remove sheet entry if it exists
      //thought to remove pubDate future date check because all are future releases, but then remembered that I check recently added books as well
      if (pubDate >= today ) {
          pubDate.setDate(pubDate.getDate() + 3);
          createCalendarEvent(title.concat(" - ", author), pubDate, link);
      }
      
    } else {        
      //create sheet entry        
      createSheetEntry(title, author, link);
    }
  }
}

function calendarEventExists(title) {
  if (title !== "Untitled") {
  //  if (debug) Logger.log("Searching calendar for: %s", title);
    let calendarId = "primary",
      optionalArgs = {
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        q: title,
        orderBy: "startTime",
      };
    let response = Calendar.Events.list(calendarId, optionalArgs);
    let events = response.items;
    if (events.length > 0) {
      for (i = 0; i < events.length; i++) {
        let event = events[i];
        let when = event.start.date;
        if (debug) Logger.log("Event exists - %s : %s", event.summary, when);
        return true;
      }
    }
  }
  if (debug) Logger.log("Event does not exist - %s", title);
  return false;
}

function createCalendarEvent(title, pubDate, link) {
  CalendarApp.getDefaultCalendar().createAllDayEvent(title, pubDate, {
    location: link,
  });
  Logger.log("Event created: " + title + "\nDate: " + pubDate);
}

function removeSheetEntry(title) {
  if (!title.includes("Untitled")) {
    if (debug) Logger.log("Searching Sheet for: %s", title);
    textFinder = ss.createTextFinder(title);
    position = textFinder.findNext();
    if (position != null) {
      Logger.log("Deleting Sheet entry for " + title);
      sheet.deleteRow(position.getRow());
    }
    else if (debug) Logger.log("Sheet entry doesn't exist: %s", title);
  }
}

function createSheetEntry(title, author, link) {
  if (firstWeekOfMonth) {
    //if publication date is missing and it's first week of the month/running in debug mode, add the book link to the sheet.
    textFinder = ss.createTextFinder(link);
    if (textFinder.findNext() == null) {
      Logger.log("Creating Sheet entry for " + title + " - " + author);
      sheet.appendRow([title, author, link]);
      sheet.getRange("D" + sheet.getLastRow()).insertCheckboxes();
    } else if (debug)
        Logger.log("Sheet entry exists for " + title + " - " + author);
  }
}

function getBooks(response) {
  // let response = fetchGoodreadsData();
  // API Connection Successful
  if (response.getResponseCode() === 200) {
    // Parse XML Response
    let results = XmlService.parse(response.getContentText())
      .getRootElement()
      .getChildren("reviews")[0];

    results.getChildren().forEach(function (result) {
      result.getChildren("book").forEach(checkData);
    });
  } else {
    Logger.log("API request error");
  }
}

function main() {
  let apiKey = "1LNBP3nLDvPJoY3trbJw1w",
    payload = {
      id: 7795126,
      shelf: "to-read",
      sort: "date_added",
      order: "d",
      page: 1,
      per_page: 10,
      key: apiKey,
    },
    params = {
      method: "GET",
      payload: payload,
      muteHttpExceptions: true,
    };

  getBooks(fetchGoodreadsData(params));
  if (today.getDate() < 7 || debug) {
    payload.sort = "date_pub";
    // payload.page = 2;
    payload.per_page = 180;
    firstWeekOfMonth = true;
    getBooks(fetchGoodreadsData(params));
    if (today.getMonth() % 2 == 0) updateCalendarEvents();
  }
}

function updateCalendarEvents() {
  Logger.log("Running updateCalendarEvents...");
  let calendarId = "primary",
    optionalArgs = {
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: "startTime",
    };
  //move all events forward by 2 days to compensate for earlier value of 1 day
  //yes, the dates for some events are probably ahead by a week now
  //modified the same script to shift URLs from description to location
  //modified the same script to change no details, just run once in every 2 months to handle the case of disappearing events
  optionalArgs.q = "goodreads";
  let response = Calendar.Events.list(calendarId, optionalArgs);
  let events = response.items;
  if (events.length > 0) {
    for (i = 0; i < events.length; i++) {
      let event = events[i];
//      Logger.log(event.summary);
      //      Logger.log(event);
      //      if (event.description != null){
      //        Logger.log(event.summary);
      //        event.description = null;
      //      }
      /*startDate = new Date(event.start.date);
      endDate = new Date(event.end.date);
      startDate.setDate(startDate.getDate() + 2);
      endDate.setDate(endDate.getDate() + 2);
      event.start.date = startDate.toISOString().slice(0,10);
      event.end.date = endDate.toISOString().slice(0,10);
      */
      Calendar.Events.update(event, calendarId, event.id);
    }
  }
}
