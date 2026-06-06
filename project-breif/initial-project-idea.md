## Data Science and Analytics Using Azure Cloud Computing Technologies

This project is designed to apply cloud computing, data engineering, and data science skills using Azure Cloud Technologies and Tools. You will analyze real-world retail data to derive insights on customer engagement and spending behaviors, delivering scalable, impactful solutions through Azure services. With the rapid growth in data across industries—especially in healthcare, finance, and retail—data analytics has become critical for advancements like drug discovery, investment analysis, and demand forecasting.

## Project Abstract:

With the rising demand for cloud and data professionals, this project provides students with hands-on experience in building end-to-end solutions on Azure Cloud. The project focuses on data ingestion, transformation, analysis, and machine learning to generate actionable insights from retail data. Using Azure's suite of data and machine learning services, students will analyze customer engagement and spending behaviors, creating an interactive web application to visualize key findings.

In this final project, students will work with anonymized retail data from 84.51°/Kroger in Azure Cloud. The main objective is to develop solutions that enhance the retail experience by simplifying life for shoppers. Creativity and empathy for the customer experience are encouraged, with a focus on the principle: "Make the Customer's Life Easier."

## Examples of Questions to Address:

- Customer Engagement Over Time

- How does customer engagement evolve? Are households spending more or less?
Which product categories are increasing or decreasing in popularity?
Impact of Demographic Factors

- How do demographics (household composition, age, income, presence of children) influence customer engagement?
How can these insights help re-engage customers within certain categories or in-store?
Customer Segmentation

- How can we group households by demographics and spending habits for more targeted marketing?
Loyalty Program Impact

- How does loyalty program membership affect spending and purchase frequency?
Basket Analysis

- What are the commonly purchased product combinations, and how can they drive cross-selling opportunities?
Seasonal and Temporal Trends

- What are the seasonal and time-based spending patterns, and how can they inform inventory and promotion planning?
Brand and Product Preference

- What are customer preferences for private vs. national brands and organic items? How can these preferences personalize product offerings?
Customer Lifetime Value (CLV)

- How can we predict long-term revenue potential to prioritize high-value customers?
Churn Prediction

- Which customers are at risk of disengaging, and how can retention strategies address this?
Socioeconomic Influence on Shopping

- How do income and household size affect purchasing behavior, and how can this support tailored marketing?
Regional Preferences

- How do preferences vary by region, and how can inventory and promotions be adjusted to meet local demand?
Demand Forecasting

- How can we forecast product demand to improve stock levels and minimize stockouts or overstocking?

## Data Sources:

Are inside the path : './project-breif/data-sources/'

Please use the attached SAMPLE data set, which contains household level transactions over two years from a group of 400 households who shop at a retailer.  It contains all of the purchases from each household.

- What is included in the data set?
 - 400_household.csv: 400 sampled households
    Household demographics (if available for that household)
    Household Loyalty

- 400_transactions.csv: Transaction data for each household
    (Please upload a minimum of 10K records for Transactions)
    8/17/2018 8/15/2020
    Spend
    Products
    Units
    Regional Information

-  400_products.csv: Product Information
    Product Number
    Department
    Commodity
    Private vs National Brand
    Natural/Organic Product Flag    

## Requirements:

- Web Server Setup.

Launch and configure a web server in Azure (or another platform, as long as it's internet-accessible).
Design an interactive webpage with the following fields:
Username
Password
Email

- Datastore and Data Loading.

Create a datastore or database in Azure (e.g., Azure SQL, PostgreSQL, MySQL, MongoDB, Azure Storage Account) and load sample Transactions, Households, and Products data from the 8451_The_Complete_Journey_2_Sample-2-1.zipDownload 8451_The_Complete_Journey_2_Sample-2-1.zip
Use the free or least-cost option in Azure where possible.
Create a display page for a Sample Data Pull for HSHD_NUM #10, linking the Households, Transactions, and Products tables.
Sort by Hshd_num, Basket_num, Date, Product_num, Department, Commodity.  Similar to the SAMPLE DATA PULL FOR HH #0001 table shown above.

- Interactive Web Page.

Create a webpage that allows users to search for Data Pulls based on Hshd_num.
Sort results by Hshd_num, Basket_num, Date, Product_num, Department, Commodity.

- Data Loading Web App.

Create a web app that allows loading of the latest Transactions, Households, and Products datasets.
Test the output on the interactive web page from Requirement #4 to ensure it functions with updated data.

- Web Page with Dashboard.

Design a webpage with a dashboard to explore retail challenges using selected factors from the provided "Examples of Questions to Address." Creativity is encouraged.

    - Possible Retail Questions:

    Demographics and Engagement:
    How do factors like household size, presence of children, location, and income affect customer engagement?
    Engagement Over Time:
    Are households spending more or less? Which product categories are changing in popularity?
    Basket Analysis:
    What product combinations drive cross-selling?
    Seasonal Trends:
    How do seasonal patterns inform inventory and promotions?
    Brand Preferences:
    What are customer preferences for private vs. national brands and organic items?

- ML Model Application.

Use one of the following ML models—i. Linear Regression, ii. Random Forest, iii. Gradient Boosting—to perform Basket Analysis?
Retail Question: What are the commonly purchased product combinations, and how can they drive cross-selling opportunities

- Churn Prediction.

Retail Question: Which customers are at risk of disengaging, and how can retention strategies address this?  You can support this analysis using regression, correlation, graphical results, or all of the above.


