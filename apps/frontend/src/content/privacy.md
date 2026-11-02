# Your data on CharDB

This page covers what CharDB stores about you, why, and who else can see it. Last updated: 2026-11-01. We will try to keep this up-to-date, but please reach out on GitHub if you have any questions.

CharDB's source code is public at https://github.com/provinite/chardb, so you can check what this page says against what the site does.

## Your account

When you sign up we store your username, email address and password. Your password is hashed before it is saved, so we never see or store it in readable form.

Your profile can also hold a display name, bio, avatar, website and date of birth. All of these are optional.

Your email address, date of birth and privacy settings are visible only to you and to site administrators. Everything else on your profile is public.

## What you post

Characters, images, galleries, text pieces, comments, likes, follows and tags are stored so we can show them. They are public by default. Characters, galleries and media can be set to unlisted or private, which keeps them out of listings, search and other people's views of your profile.

Image files are served from our image host at long random addresses. Setting a piece private hides it on CharDB, but anyone who already has the direct address of an image file can still open it.

We keep the original file you upload alongside the smaller copies we make for display.

## Communities

Each community is run by its own staff. When you join one, its staff can see your membership, your role, the characters you have registered there, and your community activity: items, currency balances and transactions, shop purchases, trades and trait reviews. Communities keep a ledger of these so ownership history can be traced.

## Linked accounts

You can link a Discord, DeviantArt, Toyhouse or Patreon account to your profile. We ask each service only for your identity, and store just your account ID and username (and display name in the case of Discord). We do not keep the access token the service hands back, so we cannot post, read messages or act on that account for you.

A community can assign a character or item to a Discord or DeviantArt account before its owner has a CharDB account. In that case we store that account's ID and name so the owner can claim it after signing up and linking.

Community staff can see your linked account identifiers when needed, such as for delivering event prizes or items assigned to that account.

## Discord bot

Communities can add our Discord bot to their server. The Halloween event run through the bot records the Discord user IDs of players, their knocks, gifts, prizes and candy, and any DeviantArt username a player gives the bot. Candy and prizes move to a CharDB account once the player links their Discord account and joins the community.

## Email

We send email for account security and moderation only: confirming your address, password resets, password change notices, and image approval or rejection. We do not send newsletters or marketing, and we do not share your address except as noted below in the "Who processes your data" section.

## Cookies and browser storage

We set one sign-in cookie, which keeps you logged in for up to 7 days, and a short-lived cookie while you link an outside account. We also remember your light or dark theme choice.

Your browser stores your shop cart and some community details locally so pages load faster.

We do not use advertising cookies or analytics trackers.

## Logs

Our servers log each request: the address and page requested, your IP address, your browser's user agent, and the time. We use these to fix bugs, measure performance and block abuse.

We also log application events, usually an account identifier, an action, a timestamp, and error details. When something fails, the error can include whatever data that request carried, so these logs sometimes contain other information you've given us. We use them to fix bugs and for monitoring and alerting.

## Who processes your data

We do not sell your data or share it with advertisers. These services run parts of CharDB for us and handle data only to do that under an expectation of privacy.

- **Amazon Web Services** (United States) hosts the site, database and image files, and sends our email.
- **Grafana Cloud** stores our server logs and performance traces.
- **Discord, DeviantArt, Toyhouse and Patreon** receive a sign-in request when you choose to link an account.
- **Discord** invokes our bot and sees all discord bot interactions.
- **Anthropic, PBC** processes data shared during debugging.

## Deleting your data

You can delete your own images, galleries and comments at any time. Deleting a character hides it everywhere, but we keep the record so community ownership history stays intact; ask us if you want it erased completely.

## AI

CharDB has no AI features. Nothing that you submit is ever automatically sent to an AI service.

When improving the site and investigating issues, I use AI tools to save time and enable timely support as a solo developer. These tools are used in interactive (not automated) sessions to investigate application logs and data that is directly relevant to the issue. This data may include application database records.

I only look up the records involved in the issue I'm fixing. These tools are never fed bulk exports or collections of people's uploads.

The data is not used to train AI models, and is deleted after 30 days.

## Questions

Reach out at https://github.com/provinite/chardb/issues
