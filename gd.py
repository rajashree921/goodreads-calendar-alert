# -*- coding: utf-8 -*-
"""
Created on Sat Jul 27 14:14:23 2019

@author: Rajasree
"""
from __future__ import print_function
import datetime
import pickle
import os.path
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import requests
import xml.etree.ElementTree as ET


SCOPES = ['https://www.googleapis.com/auth/calendar']
def main():
    """Shows basic usage of the Google Calendar API.
    Prints the start and name of the next 10 events on the user's calendar.
    """
    creds = None
    # The file token.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    service = build('calendar', 'v3', credentials=creds)

    #obtain books
    data = {'id': 7795126, 'shelf': 'to-read', 'sort': 'date_pub', 'order':'d', 'page': 1, 'per_page': 30, 'key': '1LNBP3nLDvPJoY3trbJw1w'}
    response = requests.get('https://www.goodreads.com/review/list?v=2', params=data)
    root=ET.fromstring(response.content)
    books=[]
    for item in root.iter('book'):
        books.append({'full_title':item.find('title').text,
                       'title':item.find('title_without_series').text,
                       'date':str(datetime.date(int(item.find('publication_year').text),int(item.find('publication_month').text),int(item.find('publication_day').text))+datetime.timedelta(days=+4)),
                       'author':item.find('authors').find('author').find('name').text})
    checkdate=datetime.datetime.utcnow().isoformat()[:10]
    now = datetime.datetime.utcnow().isoformat() + 'Z' # 'Z' indicates UTC time
    for item in books:
        if(item['date']>checkdate):    
           events_result = service.events().list(calendarId='primary', timeMin=now,
                                                  singleEvents=True,
                                                  q=str(item['full_title']),
                                                  orderBy='startTime').execute()
           events = events_result.get('items', [])
           if (not events):
                    event = {
                      'summary': item['title'],
                      'description': str(item['full_title']+" : "+item['author']),
                      'start': {
                        'date': item['date']
                      },
                      'end': {
                        'date': item['date']
                      },
                      'reminders': {
                        'useDefault': True,
                      }
                    }
            
                    event = service.events().insert(calendarId='primary', body=event).execute()
                    print ('Event created: %s' % (event.get('htmlLink')))
           else:
                for event in events:
                    start = event['start'].get('dateTime', event['start'].get('date'))
                    print("Event exists: ",start, event['summary'])
    
if __name__ == '__main__':
    main()