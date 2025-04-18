# Data population
To populate the database with data, use the custom python script. In order to run it, you’d need to install [Python](https://www.python.org/downloads/) on your device, and [download the script along with the dependency list](https://github.com/seshunASU/covid-visualizer/releases/download/data_population/data_populate.zip). Once you extract the zip, you’d need to download [Google’s Covid-19 Open Data](https://health.google.com/covid-19/open-data/raw-data) (the .json for Epidemiology) and place it into the folder. In the end it should look like this:
![image](https://github.com/user-attachments/assets/241df54c-e6eb-4e41-ba7f-86f14bb7bc2f)

Then open command prompt / terminal and cd into the folder. Here you’d want to install the dependencies by running `pip install -r requirements.txt`
![image](https://github.com/user-attachments/assets/5bea37df-4182-4683-8c2e-3a3409a69882)

Now you can run the data_import.py script which will populate the database with data from epidemiology.json.
![image](https://github.com/user-attachments/assets/2816d6b0-b8dd-4ae7-8a3c-578610499375)
### Warning: the script takes a lot of memory and disk to run
---
After the script finishes running, the database should be populated.
