# RobotTool
Tool for detecting changes on webpages.

The robot tool helps statisticians detecting and processing changes on web sites.
At this moment this is mainly used for detecting price changes, but in principle the tool could be used to detect any change in a particular part of a website.

In this repo we maintain and publish an international version of the tool.
Other organisations are invited to download, experiment and use it.
The tool is provided under an EUPL licence on an ‘as is’ basis and without warranties of any kind as specified in the attached license file.
Feedback is highly appreciated (by email or by adding an issue ticket on this repo).

The development of this tool was partly subsidized by a Grant from Eurostat. Previous versions were published at our
[research server](http://research.cbs.nl/Projects/RobotTool).

## Prerequisites
- Google Chrome (version >= 61)

## Installation

```bash
  $ npm install
```

When you upgrade from a previous version of the RobotTool you have to upgrade the database.
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
