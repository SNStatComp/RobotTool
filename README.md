# RobotTool
Tool for detecting (price) changes on webpages, created and used by Statistics Netherlands.

## Workflow
The RobotTool is an interactive tool for price analysts.
The analyst defines a number of products and for each product where the product can be found on the web.
In a data collection run the tool checks the product descriptions (including prices) for changes with respect to the last run.
If nothing changed, the product status turns green and the price that was stored in the last run is written as a price observation to the databse.
If there is a change detected the product status turns red and the changes with respect to the last run are shown.
The analyst checks all red products and manually enters the correct price.
In case the red status was due to the fact that the product was not found, the analyst redefines the product configuration.
The analyst typically repeats this proces on a regular basis, per week or month, for example in the proces to compose the HICP.

![Workflow](workflow.png)

Obviously every product has to be initialised once.
The first time that a product is collected it always turns red and the analyst has to manually enter the correct price.

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
  $ npm run-script upgradeDB
```

If you have made some changes in the config file (.\inst\app\config\config.json) apply these changes also to the config file in the new version. Please don’t overwrite the new version of this file with the old version (some new config options were added).

## Usage

Start application:
```bash
  $ npm start
```

See the user guide in the documentation map for detailed description of this application.

## License and feedback
This tool is provided under an EUPL license on an ‘as is’ basis and without warranties of any kind (see license file).
Other organisations are invited to use it.
Feedback is appreciated (by email or by adding an issue ticket on this repo).


## Credits
The development of this tool was partly subsidized by a Grant from Eurostat. Previous versions were published at our
[research server](http://research.cbs.nl/Projects/RobotTool).
