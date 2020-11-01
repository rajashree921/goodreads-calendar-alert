var debug = false;
var firstWeekOfMonth = false;
var ss = SpreadsheetApp.openById(
    "1dXbvJc9i1KoiMUaTNukCYX9DS8oGmyznnXsZe4-BFZM"
  ),
  sheet = ss.getSheets()[0];

function fetchGoodreadsData(params) {
  var apiUrl = "https://www.goodreads.com/review/list?v=2";
  return UrlFetchApp.fetch(apiUrl, params);
}

function extractBookDetails(book) {
  var bookDetails = {
    title: book.getChild("title").getText(),
    titleWithoutSeries: book.getChild("title_without_series").getText(),
    author: book
      .getChild("authors")
      .getChild("author")
      .getChild("name")
      .getText(),
    link: book.getChild("link").getText(),
  };

  return bookDetails;
}

function checkFutureRelease(book) {
  // var bookDetails = extractBookDetails(book);
  var titleWithoutSeries = book.getChild("title_without_series").getText();
  //check whether event already exists for the book
  if (calendarEventNotExists(titleWithoutSeries)) {
    //check whether publication date values are filled in
    if (book.getChild("publication_day").getText()) {
      var pubDate = new Date(
        book.getChild("publication_year").getText(),
        book.getChild("publication_month").getText() - 1,
        book.getChild("publication_day").getText()
      );
      //check whether book has a future release date
      if (pubDate >= today) {
        pubDate.setDate(pubDate.getDate() + 3);
        var title = book.getChild("title").getText(),
          author = book
            .getChild("authors")
            .getChild("author")
            .getChild("name")
            .getText(),
          link = book.getChild("link").getText();
        // title = title.concat(" - ", author);
        createCalendarEvent(title.concat(" - ", author), pubDate, link);
        removeSheetEntry(titleWithoutSeries);
      }
    } else createSheetEntry(title, author, link);
  }
}

function calendarEventNotExists(title) {
  var calendarId = "primary",
    optionalArgs = {
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      q: title,
      orderBy: "startTime",
    };
  var response = Calendar.Events.list(calendarId, optionalArgs);
  var events = response.items;
  if (events.length > 0) {
    for (i = 0; i < events.length; i++) {
      var event = events[i];
      var when = event.start.date;
    }
    if (debug) Logger.log("Event exists - %s : %s", event.summary, when);
    return false;
  }
  return true;
}

function createCalendarEvent(title, pubDate, link) {
  CalendarApp.getDefaultCalendar().createAllDayEvent(title, pubDate, {
    location: link,
  });
  if (debug) Logger.log("\nEvent created: " + title + "\nDate: " + pubDate);
}

function removeSheetEntry(title) {
  textFinder = ss.createTextFinder(title);
  position = textFinder.findNext();
  if (position != null) {
    sheet.deleteRow(position.getRow());
  }
}

function createSheetEntry(title, author, link) {
  if (firstWeekOfMonth) {
    //if publication date is missing and it's first week of the month/running in debug mode, add the book link to the sheet.
    textFinder = ss.createTextFinder(title);
    if (textFinder.findNext() == null) {
      sheet.appendRow([title, author, link]);
    }
  }
}

function getBooks(response) {
  // var response = fetchGoodreadsData();

  // API Connection Successful
  if (response.getResponseCode() === 200) {
    // Parse XML Response
    var results = XmlService.parse(response.getContentText())
      .getRootElement()
      .getChildren("reviews")[0];

    results.getChildren().forEach(function (result) {
      result.getChildren("book").forEach(checkFutureRelease);
    });
  } else {
    Logger.log("API request error");
  }
}

function main() {
  var today = new Date(),
    apiKey = "1LNBP3nLDvPJoY3trbJw1w",
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
    payload.per_page = 100;
    firstWeekOfMonth = true;
    getBooks(fetchGoodreadsData(params));
  }
}

function updateCalendarEvents(){
//move all events forward by 2 days to compensate for earlier value of 1 day
//yes, the dates for some events are probably ahead by a week now
//modified the same script to shift URLs from description to location
  optionalArgs.q = 'goodreads';
  var response = Calendar.Events.list(calendarId, optionalArgs);
  var events = response.items;
  if (events.length > 0) {
    for (i = 0; i < events.length; i++) {
      var event = events[i];
//      Logger.log(event.summary);
//      Logger.log(event);
      if (event.description != null){
        Logger.log(event.summary);
        event.description = null;
      }
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