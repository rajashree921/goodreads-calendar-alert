var debug = false;
var results = [],
  missingInfo = [],
  today = new Date(),
  apiUrl = "https://www.goodreads.com/review/list?v=2",
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
  },
  ss = SpreadsheetApp.openById("1dXbvJc9i1KoiMUaTNukCYX9DS8oGmyznnXsZe4-BFZM"),
  sheet = ss.getSheets()[0];

function getBooks(firstWeekOfMonth) {
  var response = UrlFetchApp.fetch(apiUrl, params);

  // API Connection Successful
  if (response.getResponseCode() === 200) {
    // Parse XML Response
    var results = XmlService.parse(response.getContentText())
      .getRootElement()
      .getChildren("reviews")[0];

    results.getChildren().forEach(function (result) {
      result.getChildren("book").forEach(function (book) {
        var title = book.getChild("title").getText(),
          titleWithoutSeries = book.getChild("title_without_series").getText(),
          author = book
            .getChild("authors")
            .getChild("author")
            .getChild("name")
            .getText(),
          link = book.getChild("link").getText();
        if (calendarEventNotExists(titleWithoutSeries)) {
          //check whether event already exists for the book
          if (book.getChild("publication_day").getText()) {
            //check whether publication date values are filled in
            var pubDate = new Date(
              book.getChild("publication_year").getText(),
              book.getChild("publication_month").getText() - 1,
              book.getChild("publication_day").getText()
            );
            if (pubDate >= today) {
              //check whether book has a future release date
              pubDate.setDate(pubDate.getDate() + 2);
              title = title.concat(" - ", author);
              CalendarApp.getDefaultCalendar().createAllDayEvent(
                title,
                pubDate,
                { location: link }
              );
              if (debug)
                Logger.log("\nEvent created: " + title + "\nDate: " + pubDate);
              textFinder = ss.createTextFinder(titleWithoutSeries);
              position = textFinder.findNext();
              if (position != null) {
                sheet.deleteRow(position.getRow());
              }
            }
          } else if (firstWeekOfMonth) {
            //if publication date is missing and it's first week of the month/running in debug mode, add the book link to the sheet.
            textFinder = ss.createTextFinder(title);
            if (textFinder.findNext() == null) {
              sheet.appendRow([title, author, link]);
            }
          }
        }
      });
    });
  } else {
    Logger.log("API request error");
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

function main() {
  getBooks(false);
  if (today.getDate() < 7 || debug) {
    payload.sort = "date_pub";
    payload.per_page = 100;
    getBooks(true);
  }
}
