# RobotTool
Tool for detecting (price) changes on webpages.

In this repo we maintain and publish an international version of the RobotTool.
Other organisations are invited to experiment and use it.
The tool is provided under an EUPL license on an ‘as is’ basis and without warranties of any kind (see license file).
Feedback is appreciated (by email or by adding an issue ticket on this repo).


## Prerequisites
- Node.js (version 8 or higher)
- Google Chrome (version >= 61) or Mozilla Firefox (version >= 56)

## Installation

```bash
  $ npm install
```

## Upgrading

When you upgrade from an earlier version of the RobotTool and want to re-use your existing database, copy the file observationDB.sqlite in the folder ‘inst/server/db’ to the same folder in the new version.
When you upgrade from Robottool version < 3 you also have to upgrade the database.

Run the command:
```bash
  $ npm upgradeDB
```

If you have made some changes in the config file (.\inst\app\config\config.json) apply these changes also to the config file in the new version. Please don’t overwrite the new version of this file with the old version (some new config options were added).

## Usage

Start application:
```bash
  $ npm start
```

See the user guide in the documentation map for detailed description of this application.

## Credits
The development of this tool was partly subsidized by a Grant from Eurostat. Previous versions were published at our
[research server](http://research.cbs.nl/Projects/RobotTool).
