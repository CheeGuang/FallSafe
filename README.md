# <img src="./frontend/img/FallSafe-WhiteBackground.png" alt="MindSphere Logo">

## How to Run the Project

### **Method 1: Hosted Version**

1. **Visit the Hosted Project**:
   Open your browser and navigate to:
   [http://fallsafe.hellojeffreylee.com:8000](http://fallsafe.hellojeffreylee.com:8000)

---

### **Method 2: Local Kubernetes Deployment**

1. **Clone the Repository**:

```

git clone https://github.com/CheeGuang/FallSafe

```

2. **Request the Environment File**:

- Contact the administrator (Jeffrey, @CheeGuang on Telegram) to obtain the `.env` file and place it in the root directory.

3. **Run Kubernetes Deployment**:

```

deploy-k8s.bat

```

4. **Perform Port Forwarding**:

```
port-forward-all.bat
```

5. **Access the Application**:

- Open your browser and navigate to `http://localhost:8080`.

---

## Introduction

<div style="display: flex; justify-content: center">

<img src="./frontend/img/ReadME/FallSafe.JPG" alt="FallSafe Image" style="float: right; width: 300px; margin-left: 20px;">

</div>

This project is developed where our key stakeholder is **Lions Befrienders**. The problem statement we are addressing is:

**How might we use Technology to offer an easy and user-friendly way for seniors to perform preliminary self-assessment in the comfort of their own homes, with vulnerable cases being highlighted for further clinical assessment by doctors?**

Our solution is a **100% Cloud Native** application with **Microservice Architecture**, allowing seniors to take the **Falls Efficacy Scale test** and perform **physical self-assessments** from the comfort of their homes.

## Target Audience

<div style="display: flex; justify-content: center">

<img src="./frontend/img/ReadME/Target Audience.png" alt="FallSafe Image" style="float: right; width: 300px; margin-left: 20px;">

</div>

**FallSafe** is designed to support **elderly individuals** who want to assess their fall risk easily and accurately from the **comfort of their home**. Our primary user persona, **Mrs Tan**, represents the key demographics and challenges our solution aims to address.

### **Goals**

- **Check fall risk at home** – No need for clinic visits.
- **Understand her body** – Gain insights into mobility and balance.
- **Visit the doctor conveniently** – Seek medical help if the risk is high.

### **Challenges**

- **Quick & accurate self-assessment** – Needs a **reliable** but **easy-to-use** tool.
- **Understanding results** – Prefers **simple, jargon-free explanations**.
- **Easy doctor access** – Requires a **seamless way to book consultations** if needed.

By addressing these needs, **FallSafe empowers elderly individuals** to proactively manage their fall risk, promoting **safety, independence, and well-being**.

### **Unique Selling Point**

<div style="display: flex; justify-content: center">

<img src="./frontend/img/ReadME/User Testing.jpg" alt="FallSafe Image" style="float: right; width: 300px; margin-left: 20px;">
</div>

We integrate **IoT and AI** into our solution to enhance user experience:

- A **multi-lingual Text-to-Speech model** guides users on how to perform tests.
- The **FallSafe Device** tracks real-time body movements and sends data to our Cloud application via **AWS IoT Core**.
- The system processes this data to generate a **comprehensive and easy-to-understand result dashboard**.

After completing a test, users:

- Receive **$10 NTUC Vouchers**.
- Can **schedule a teleconsultation** with a doctor via **Calendly**, which integrates with **Google Calendar and Google Meet**.

On the **admin side**:

- They can **track users who have not completed their tests** and send reminders.

---

### **Unwavering Commitment to Customer Data Security**

At **FallSafe**, protecting user privacy and data security is our top priority. We implement **industry-leading security standards** to ensure the **confidentiality, integrity, and availability** of sensitive information. Our security measures include:

#### **Customer Data Security**

- **Regulatory Compliance:** Aiven Cloud Database adheres to **GDPR, HIPAA, ISO 27001, SOC2**, ensuring strict data protection and privacy standards.
- **Secure Cloud Storage:** Utilizes **AWS S3** for encrypted data storage.
- **Cloud Infrastructure Security:** Leveraging **Google Cloud** and **Render**, ensuring robust security, reliability, and scalable performance.
- **AI and Multilingual Security:** **OpenAI** and **Google Translate** are integrated with strict access controls, ensuring data privacy while enabling multilingual accessibility.

#### **Container Security**

- **Docker & Kubernetes:** Implementing **containerized security** to ensure **fault isolation, scalability, and automated recovery**, protecting against system vulnerabilities.

#### **End-to-End Encryption**

- **Google Meets:** Secure communication channels with **end-to-end encryption**, safeguarding user interactions.

#### **Data Encryption in Transit**

- **SMTP Protocol:** Encrypted email transmissions ensure **secure delivery of notifications** and communications.
- **Calendly Integration:** Secure scheduling system ensuring **protected user interactions** with **Google Calendar and Google Meet**.

---

## Features

### **Falls Efficacy Scale**

- Integrated with **Google Translate** and **OpenAI**, allowing users to take this **internationally recognised fall risk assessment** easily.
- Supports multiple languages, ensuring accessibility for diverse user groups.

### **Physical Self-Assessment**

- Uses **AWS IoT Core** to track real-time **body movements** and assess balance and coordination.
- Provides instant feedback and personalised recommendations for fall prevention.

### **NTUC Voucher Gamification**

- Users receive **$10 NTUC vouchers** upon completing the fall risk assessment with a 6 months cool down.
- Encourages engagement through **gamification mechanics**, increasing participation rates.
- Enables **repeat assessments** for continuous fall risk monitoring, ensuring seniors stay proactive in maintaining their health.

### **Elderly Fall Risk Analysis Dashboard**

- **Powered by OpenAI**, offering **actionable insights** based on assessment results.
- Uses **Chart.js** to present **comprehensive charts** for a clear visual representation of fall risks.
- Helps seniors **track progress** over time and make informed health decisions.

### **Teleconsultation with a Doctor**

- Seamless integration with **Calendly, Google Calendar, and Google Meet**.
- Enables users to **book virtual consultations** with doctors for further assessment.
- Ensures timely medical intervention for high-risk users.

### **Admin Dashboard for Elderly Fall Risk Analysis**

- Provides an **overview of all seniors' fall risk levels**.
- Enables administrators to **track test completion rates** and identify **high-risk cases**.
- Supports **data-driven decision-making** for elderly care organisations.

### **Admin Reminder System**

- Allows admins to **send reminders** to elderly users to take their fall risk assessments.
- Ensures higher engagement and completion rates for the self-assessment tests.
- Supports **SMS and email notifications** for convenience.

---

## User Testing

<img src="./frontend/img/ReadME/FallSafe User Testing 1.JPG" alt="FallSafe Image 1" style="width: 300px;">
<img src="./frontend/img/ReadME/FallSafe User Testing 2.JPG" alt="FallSafe Image 2" style="width: 300px;">

In total, we conducted **5 Official User Tests** with individuals aged **55-85 years old**. Through these sessions, we gathered valuable feedback to fine-tune **Fall Risk calculations**, enhance **UI/UX** for elderly users, and help them become more independent in their fall risk assessments. These tests also helped identify edge case bugs and improve the representation of results in the **Dashboard**.

Each test included:

- Evaluation of the **Falls Efficacy Scale**, **Self-Assessment**, and **Dashboard** for fall risk analytics.
- Unmoderated free-roam time to explore the website and interact with the system independently.

FallSafe saw significant improvements with each iteration, ensuring a more user-friendly and accurate experience for seniors.

---

## Future Expansions

<div style="display: flex; justify-content: center">
<img src="./frontend/img/ReadME/Future Expansion.png" alt="FallSafe Image" style="float: right; width: 300px; margin-left: 20px;">
</div>

We plan to integrate **FallSafe** into **Lions Befrienders' Our Kampung Application**, enabling users to leverage their **mobile phone's gyroscope as a Body Motion Tracker**. This reduces the need for separate motion tracking devices, lowering costs and improving scalability.

Additionally, we can tap into the **Smart Nation Singapore initiative** by leveraging the **Mobile Access for Seniors** program, which provides a **subsidiesd mobile phones** starting from **$20** and a **2-year mobile plan at $5.10 per month**. This will enable seamless digital inclusion, ensuring seniors have access to **FallSafe** without financial barriers.

### **What is Our Kampung?**

**Our Kampung** is an application by **Lions Befrienders (LB)** aimed at **bridging the digital divide for seniors** by providing access to digital services, health tracking, and community engagement.

### **What is Smart Nation's Mobile Access for Seniors?**

The **Smart Nation Mobile Access for Seniors** initiative offers a **2-year mobile plan at $5.10 per month**, enabling seniors to stay connected affordably. This initiative ensures digital inclusion and accessibility, making it easier for seniors to engage with technology-driven solutions like **FallSafe**.

---

## Network Architecture

The **FallSafe** architecture is designed as a **Cloud-Native Microservice-Based System** to maximize **ROI** and **operational efficiency** while ensuring resilience and adaptability. This approach allows the system to **react to failures, recover quickly, and minimize business impact**.

### <img src="./frontend/img/ReadME/Network Diagram.png" alt="FallSafe Image">

### **Key Cloud-Native Concepts Utilized:**

1. **Microservices Architecture**

   - Each core function (User, Authentication, Admin, Self-Assessment, Falls Efficacy Scale, and OpenAI) is **independently containerized** using **Docker** and orchestrated via **Kubernetes**.
   - This enables **scalability, fault isolation, and service independence**, allowing parts of the system to be updated or recovered without affecting the entire application.

2. **Kubernetes & Auto Scaling**

   - The system is deployed on **AWS EC2 instances running Kubernetes**, ensuring **automated scaling and high availability**.
   - Load balancing and resource allocation dynamically adjust based on user demand, **optimizing costs** and improving **performance stability**.

3. **Route 53 Subdomain for Custom Access**

   - The application is accessible via http://fallsafe.hellojeffreylee.com:8000/, configured using AWS Route 53.
   - **Custom DNS routing** ensures users can reach the application seamlessly, enhancing **branding and accessibility**.
   - The **subdomain points to an EC2 instance** running Kubernetes, allowing for high availability and scalability.

4. **IoT Integration**

   - **FallSafe Device** (ESP32S3) connects via **AWS IoT Core** using **MQTT Message Queue**, transmitting real-time motion data to the cloud.
   - The **frontend connects to the application via WebSockets** for real-time communication with the **FallSafe Device**.
   - Results is then displayed in **real-time on the User Dashboard** using **Chart.js**.
   - **OpenAI analyzes results**, providing actionable insights on how users can **maintain and improve** their fall risk.

5. **Serverless Email & AI Integration**

   - **AWS Lambda** and **AWS Simple Email Service (SES)** handle **automated notifications**.
   - The **OpenAI microservice** integrates advanced AI models for data analysis and multilingual text to speech.

6. **Seamless User Experience with Third-Party Services**

   - **Calendly integration** allows users to **schedule teleconsultations** with **Google Calendar and Google Meet**.
   - Secure authentication and **Gmail SMTP** ensure smooth user interactions and communication.

7. **CI/CD with Docker Hub**

   - **Docker Hub** is utilized as part of the **CI/CD process**, ensuring that **EC2 instances can pull the latest container images and deploy updates seamlessly**.
   - This enhances **deployment efficiency, minimizes downtime, and ensures consistency** across environments.

8. **AWS Security & Monitoring**

   - The architecture leverages **AWS WAF, Shield, GuardDuty, and IAM** for **robust security enforcement**.
   - **AWS CloudWatch and AWS CloudTrail** provide real-time **monitoring, logging, and auditing**, enabling rapid **issue detection and resolution**.
   - **CloudWatch Alarms** are configured with **SNS notifications**, alerting administrators to critical system events, ensuring proactive issue management and minimizing downtime.
   - Data is stored on **Aiven's Cloud MySQL Database**, which offers a **99.99% SLA** and complies with **ISAE 3000, ISO 27000, GDPR, CCPA, HIPAA, and PCI DSS** security standards.

This architecture ensures **high availability, flexibility, and resilience**, enabling **FallSafe** to operate efficiently while maintaining a **seamless user experience**.

### Container Orchestration

The **FallSafe** system utilizes **Kubernetes** for efficient **container orchestration**, ensuring smooth deployment, management, and scaling of microservices.

#### **Key Benefits of Kubernetes in FallSafe:**

- **Automated Scaling** – Kubernetes dynamically adjusts resources based on demand, optimizing system performance.
- **High Availability** – Ensures fault tolerance by redistributing workloads in case of failures.
- **Service Isolation** – Each microservice runs in an independent container, reducing dependencies and improving modularity.
- **Rolling Updates & CI/CD Integration** – Updates are deployed **seamlessly** with minimal downtime.
- **Self-Healing Mechanisms** – Kubernetes automatically restarts failed containers and replaces unhealthy nodes.

### Cloud Scalability on Cloud Services

The **FallSafe** architecture is designed with **cloud scalability in mind**, leveraging **AWS cloud services** to handle fluctuating demand efficiently.

#### **How Cloud Scalability Enhances FallSafe:**

- **Elastic Compute Scaling** – **AWS EC2 On-Demand instances** scale based on workload demands, ensuring cost efficiency and optimal performance without over-provisioning.

- **Serverless Scalability** – **AWS Lambda** handles event-driven processes like email notifications, adapting seamlessly to traffic spikes.
- **Database Scaling** – The system uses **Aiven Cloud MySQL**, which supports **automatic replication and read scaling**, ensuring **high availability and fast query performance**.
- **Scalable Storage** – **AWS S3** provides infinite storage scalability, allowing secure and cost-effective data handling for user-generated content and system logs.
- **IoT Data Processing** – **AWS IoT Core** scales effortlessly to handle increasing motion tracking data from multiple **FallSafe Devices**, ensuring **real-time analytics**.

By implementing **container orchestration with Kubernetes** and **scalable cloud services**, FallSafe ensures **resilience, efficiency, and future-ready performance** for all users.

---

## FallSafe Device Documentation

### <img src="./frontend/img/ReadME/FallSafe Device.jpg" alt="FallSafe Device">

### Overview

The **FallSafe Device** is an IoT-enabled motion tracking system designed for **Fall Risk Assessments**. It consists of an **ESP32-S3 microcontroller**, a **GY-91 MPU9250 sensor module**, and a **custom battery pack** soldered to a **Micro USB connector**. This device collects **real-time body movement data** and transmits it to the cloud for analysis.

### Components

#### 1. **ESP32-S3**

- WiFi and Bluetooth-enabled microcontroller with high processing power.
- Facilitates **real-time data streaming** to the cloud via **AWS IoT Core**.
- Supports **MQTT protocol** for **efficient message queuing**.

#### 2. **GY-91 MPU9250 (Inertia Measurement Unit Sensor)**

- Tracks **accelerometer, gyroscope, magnetometer** data.
- Provides **precise motion tracking** for **Fall Risk Assessments**.

#### 3. **Custom Battery Pack**

- Made from **three AA Energizer batteries** in series.
- Soldered to a **Micro USB connector** for easy ESP32-S3 power supply.
- Enables portability and independent operation.

### AWS IoT Core Integration

The **FallSafe Device** integrates with **AWS IoT Core** using **MQTT**, allowing for **secure, real-time data transmission**. The collected motion data is processed and analyzed in the **FallSafe Cloud Application**, enabling **body motion tracking and fall risk evaluation**.

#### **How It Works:**

1. **Sensor Data Collection**

   - The **GY-91 MPU9250** records movement and positional data.
   - Data is processed by the **ESP32-S3**.

2. **MQTT Message Queue**

   - The ESP32-S3 publishes motion data to an **MQTT topic** in **AWS IoT Core**.
   - The cloud application subscribes to the **motion tracking queue**.

3. **Data Processing & Dashboard Visualization**
   - Data is analyzed in real-time.
   - Users receive feedback via the **FallSafe Dashboard**.
   - **AI-generated insights** guide users on improving stability and mobility.

---

## Contributors

- Lee Guang Le, Jeffrey (Product Owner, Developer)
- Jovan Ong Yi Jie (Developer)
- Putera Daniel (Developer)
- Tan Guo Zhi Kelvin (Developer)
