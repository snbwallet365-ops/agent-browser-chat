"""Explicitly authorized read-only Cloud CDP inspection. Never submits applications."""
import argparse
import json
import os
from urllib.parse import urlsplit
from browser_use_sdk.v4 import BrowserUse
from playwright.sync_api import sync_playwright

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True)
    parser.add_argument('--country', choices=['au','rs','tr','sg','ru','my','sa','bh'], required=True)
    parser.add_argument('--authorize-paid-browser', action='store_true')
    args = parser.parse_args()
    target = urlsplit(args.url)
    hosts = {host.strip().lower() for host in os.environ.get('VISA_PORTAL_HOSTS', '').split(',')}
    if target.scheme != 'https' or target.hostname not in hosts or target.username or target.password or target.port not in (None,443):
        parser.error('URL must be HTTPS and explicitly allowlisted')
    if not args.authorize_paid_browser:
        parser.error('Paid browser authorization is required')
    with BrowserUse() as client:
        managed = client.browsers.create(proxy_country_code=args.country)
        try:
            if not managed.cdp_url:
                raise RuntimeError('Cloud browser did not return CDP control URL')
            with sync_playwright() as playwright:
                browser = playwright.chromium.connect_over_cdp(managed.cdp_url)
                try:
                    context = browser.contexts[0]
                    def guard(route):
                        request = route.request
                        url = urlsplit(request.url)
                        if request.is_navigation_request() and (url.scheme != 'https' or url.hostname not in hosts):
                            route.abort()
                        elif request.method not in {'GET','HEAD','OPTIONS'}:
                            route.abort()
                        else:
                            route.continue_()
                    context.route('**/*', guard)
                    page = context.pages[0] if context.pages else context.new_page()
                    page.goto(args.url, wait_until='domcontentloaded', timeout=30000)
                    print(json.dumps({'title': page.title(), 'url': page.url, 'mode': 'read_only', 'note': 'No form submitted'}, ensure_ascii=False))
                finally:
                    browser.close()
        finally:
            # SDK stop maps to PATCH /api/v4/browsers/{id}, action=stop.
            client.browsers.stop(managed.id)

if __name__ == '__main__':
    main()
