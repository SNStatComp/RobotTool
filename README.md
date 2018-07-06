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

When you upgrade from Robottool version < 3 you have to upgrade the database.
Copy the file observationDB.sqlite in map 'inst/server/db' from your previous version of the RobotTool to the same map in this version.

Run the command:
```bash
  $ npm upgradeDB
```

## Usage

Start application:
```bash
  $ npm start
```

See the user guide in the documentation map for detailed description of this application.

## Credits
The development of this tool was partly subsidized by a Grant from Eurostat. Previous versions were published at our
[research server](http://research.cbs.nl/Projects/RobotTool).
