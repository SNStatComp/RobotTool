[![Mentioned in Awesome Official Statistics ](https://awesome.re/mentioned-badge.svg)](http://www.awesomeofficialstatistics.org)

# RobotTool
Tool for detecting (price) changes on webpages by [Statistics Netherlands](https://www.cbs.nl/en-gb).

Note: As of June 2022, this repo will no longer be updated to reflect changes on the internal CBS production version of the tool. We keep this version here "as is" for whoever wants to use it or borrow from it, but note that security updates were no longer applied.

## Workflow
The RobotTool is an interactive tool for price analysts.

The analyst **defines** a number of **products** and their locations on the web.
During **data collection** the tool checks the products on the websites.
If nothing changed the product status turns green and the last known price for that product is added to the database.
If a change was detected the product status turns red.
The analyst **checks** all **products with status red**:
- If the **price** was **unchanged** the analysts **keeps the price**.
- If the **price** was **changed** the analyst **corrects the price**.
- If the product was not found usually because of a **website change** the analyst **redefines** the **product** configuration.

![Workflow](workflow.png)

The analyst typically repeats this proces on a regular basis, per week or month, for example in the proces to compose the HICP.

## Installation
- Install [node.js](https://nodejs.org/en/) and a modern browser (Firefox, Chrome)
- Download the [latest release](https://github.com/SNStatComp/RobotTool/releases/latest), unzip it, and  run from the command line in the extracted folder:
```bash
  $ npm install
```
## Start
Run from the command line: 
```bash
  $ npm start
```
A webserver will be started and a browser window will pop up.

## Example
From release 4.0.1 an example database is preloaded. This database shows several ways to retrieve data from two **fake webshops**:
- [ABC_Bikes](https://snstatcomp.github.io/webscrapingtests/RobotTool/ABC_Bikes): this site contains static prices
- [Cheap_Bikes](https://snstatcomp.github.io/webscrapingtests/RobotTool/Cheap_Bikes): this site contains dynamic prices: some of them change when retrieving the page again. 

When pressing the `Get new priceinfo` button on the right upper corner the tool will collect prices from the fake webshops.
You can then manually initialize the price from the 'price' field in the panel that pops up after pressing one of the red boxes.
After retrieving new data using the `Get new priceinfo` the changes will become visible. For further interaction we refer to the user guide below.

This is a screenshot of the tool after some runs:

![screenshot](example1.png)

Versions prior to 4.0.1: load the example database from the file `Example_1_bikes.csv` in the folder `ImportExport` via the `Edit` -> `Import configuration` button from the products panel (left top)

## RobotTool user guide
The RobotTool user guide contains a more detailed description of the functionality of the tool, the import and export of configuration and prices, to work with XPaths and how to configure the tool.
It is available in two versions in de `/Doc` folder of this repo:
- [online version](Doc/user_guide.md)
- [pdf version](Doc/user_guide.pdf)
  
In addition there is a *Poster* [pdf](Doc/20200407_RobotTool_Poster.pdf)

## Limitations / known bugs
- This tool uses a headless version of your browser (usually FireFox). Upon exit of the tool the headless browser process keep running in the background until you explicitly stop it (using the task manager) or restart your computer.

## Suggestions
Questions, suggestions, ideas are welcome:
- Add an item to the [issue tracker](https://github.com/SNStatComp/RobotTool/issues) issue tracker (you need a GH account).
- Send us a [pull request](https://help.github.com/articles/creating-a-pull-request/) if you have an improvement you think is valuable to all.
- Send an e-mail to `o.tenbosch <at> cbs.nl`.

## References
The ideas and concepts behind webscraping for official statistics are described in the following publications:
-  [Web scraping meets survey design: combining forces](https://www.bigsurv18.org/conf18/uploads/73/61/20180820_BigSurv_WebscrapingMeetsSurveyDesign.pdf), O. ten Bosch et al., BIGSURV18 Conference, 2 september 2018
-  [On the use of Internet data for the Dutch CPI](http://www.unece.org/fileadmin/DAM/stats/documents/ece/ces/ge.22/2016/Session_2_Netherlands_on_the_use_of_internet_data_for_the_Dutch_CPI.pdf), R. Griffioen and O. ten Bosch, Meeting of the Group of Experts on Consumer Price Indices (2016)
-  [On the use of internet robots for official statistics](http://www.unece.org/fileadmin/DAM/stats/documents/ece/ces/ge.50/2014/Topic_3_NL.pdf), O. ten Bosch and D. Windmeijer, UNECE MSIS 2014
-  [Automated data collection from web sources for official statistics: First experiences](https://www.iospress.nl/journal/statistical-journal-of-the-iaos/), R. Hoekstra, O. ten Bosch, F. Harteveld, Statistical Journal of the IAOS, Volume 28, Number 3-4 / 2012, p. 99-111, mrt. 2013

## License
This tool is provided under an EUPL license on an ‘as is’ basis and without warranties of any kind (see [license file](./LICENSE)).

## Credits
Go to Dick Windmeijer, the original developer of this tool, and to many price analysts from the price department of Statistics Netherlands.
Early versions of this tool were partly subsidized by a Grant from Eurostat. Older versions are still available at our [research server](http://research.cbs.nl/Projects/RobotTool).

## Other software, somehow related:
- https://github.com/scrapinghub/price-parser
- https://github.com/kserhii/money-parser
- https://github.com/BenMagyar/product-info
- https://grimmdude.com/projects/ Productwatch plugin Chrome