# 2.2 Front Desk Officer (FDO) System Manual & Corrected Documentation

## 1. Overview
After a user logs in to the application page, menus and information are displayed on the application page as shown below. The Front Desk Officer (FDO) is responsible for checking and receiving applications from clients. The officer also provides different receipts and information such as application acknowledgment receipts, application rejection receipts, reports, etc.

---

## 2. Creating an Application
Basic information of the application and detailed information related to the applicant shall be verified before an application transaction is carried out. Identification certificates of the applicant such as Kebele identification, driving license, passport, and other supported documents for the application shall be submitted. 

Applicant types can be:
- **Landholder / Holder** (Individual property owner)
- **Authorized Agent** (Representative with legal power of attorney)
- **Institution Representative** (Governmental or non-governmental organizations, private organizations, or associations)

Thus, application information that has to be registered may differ in accordance with applicant type.

### Steps to Create an Application:
1. Click on the **New Application** button on the application page.
2. Select **Applicant Type** and **Application Type** from the listed types on the application form.
3. Add submitted documents related to the application.
4. Enter or select the unique identification code of the parcel.
5. Fill in all necessary fields of applicant details (First Name, Father Name, Grandfather Name, Mother Name, Gender, Birth Date, Birth Place, Marital Status, Personal ID Type, Personal ID, TIN Number).
6. After finishing, click on the **Save** button. At that time, a success message appears on the application form: `"Application is created successfully on 1 parcel(s)"`.

> [!NOTE]
> If application creation fails, the system will display an error message. Correct the form inputs based on the displayed error message.

---

## 3. Modifying an Existing Application
A Front Desk Officer can modify incorrect information by following the steps below:
1. Locate the application in the **Application List** and click on the plus sign (`+`) under the **Action** menu column.
2. Click on the **Update** button. The former application form appears pre-filled with the application's current details.
3. After correcting the incorrect information, click on the **Save** button. At that time, a confirmation message of updating appears on the form (`"Application updated successfully"`).

---

## 4. Application Status & Action Menu Commands

| Status | Action Menu Commands | Description |
| :--- | :--- | :--- |
| **Submitted** | `+ New Transaction`<br>`✎ Update`<br>`⊘ Reject`<br>`✖ Delete`<br>`≡ View Transactions`<br>`▤ View Parcel`<br>`█ View Detail` | Allows initiating new transactions, updating incorrect information, rejecting/deleting the application, or viewing linked parcels/transactions. |
| **In Progress** | `≡ View Transactions`<br>`▤ View Parcel`<br>`█ View Detail` | Application is actively being processed by DO/RO/SRO officers. |
| **Finished** | `🖨 Print`<br>`≡ View Transactions`<br>`▤ View Parcel`<br>`█ View Detail` | Application completed; allows printing Application Acknowledgment Receipt. |
| **Withdrawn** | `✓ Accept`<br>`💬 Withdraw Reason`<br>`🖨 Print`<br>`≡ View Transactions`<br>`▤ View Parcel`<br>`█ View Detail` | Application withdrawn or rejected; allows printing Application Rejection Receipt and viewing withdrawal reason. |

---

## 5. Summary of Corrected Spelling & Grammatical Errors

Below is the detailed list of spelling, typographical, and grammatical corrections made to the provided original specification text and screenshot callouts:

| # | Original Text / Screenshot Callout | Corrected Text | Type of Correction |
| :- | :--- | :--- | :--- |
| 1 | `After a user log in to application page` | `After a user logs in to the application page` | Subject-verb agreement & missing article |
| 2 | `etc. report   Creating an Application` | `etc.<br><br>## Creating an Application` | Section heading formatting |
| 3 | `supported documents for the  pplication` | `supported documents for the application` | Typo fix (`pplication` -> `application`) |
| 4 | `application Information` | `application information` | Capitalization fix |
| 5 | `To create application` | `To create an application` | Missing article |
| 6 | `from listed type` | `from the listed types` | Article & pluralization fix |
| 7 | `documents related of the application` | `documents related to the application` | Preposition fix (`of` -> `to`) |
| 8 | `click on save button` | `click on the Save button` | Article & capitalization fix |
| 9 | `as sown below` | `as shown below` | Typo fix (`sown` -> `shown`) |
| 10 | `If application creation is failed` | `If application creation fails` | Grammar fix |
| 11 | `display error message` | `display an error message` | Missing article |
| 12 | `by following steps below` | `by following the steps below` | Missing article |
| 13 | `click on update button` | `click on the Update button` | Article & capitalization fix |
| 14 | Callout: `Modfication Date` | `Modification Date` | Typo fix (`Modfication` -> `Modification`) |
| 15 | Callout: `In Progressed` | `In Progress` | Grammar fix in status label |
| 16 | Callout: `allows keeping felt info.` | `allows keeping filled info.` | Typo fix (`felt` -> `filled`) |
| 17 | Callout: `allows resetsing application page` | `allows resetting application page` | Typo fix (`resetsing` -> `resetting`) |
| 18 | Banner: `Application is created successfuly on 1 parcels` | `Application is created successfully on 1 parcel` | Typo fix (`successfuly` -> `successfully`) & singular form |
