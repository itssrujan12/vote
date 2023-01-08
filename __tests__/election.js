/* eslint-disable no-undef */
const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
// eslint-disable-next-line no-unused-vars
const { response } = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Online Voting application test suite", function () {
  beforeAll(async () => {
    server = app.listen(5000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Signup as New user", async () => {
    res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admin").send({
      firstName: "Rohit",
      lastName: "Avadhanula",
      email: "rohit@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Existing User login", async () => {
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    await login(agent, "rohit@test.com", "12345678");
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
  });

  test("Signout ", async () => {
    let res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(302);
  });

  test("Create New  election", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");
    const res = await agent.get("/addquestion");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/elections").send({
      electionName: "election",
      publicurl: "election-urll",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Adding New question", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");

    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "vote your leader",
      publicurl: "url2",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/elections")
      .set("Accept", "Application/json");
    const parsedResponse = JSON.parse(groupedResponse.text);
    console.log(parsedResponse);
    const electionCount = parsedResponse.elections_list.length;
    const latestElection = parsedResponse.elections_list[electionCount - 1];

    res = await agent.get(`/createquestions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    res = await agent.post(`/createquestions/${latestElection.id}`).send({
      questionname: "Class GR",
      description: "Vote",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Deleting question", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");

    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "FAVOURATE SPORTS",
      publicurl: "url3",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/elections")
      .set("Accept", "Application/json");
    const parsedResponse = JSON.parse(ElectionsResponse.text);
    const electionCount = parsedResponse.elections_list.length;
    const latestElection = parsedResponse.elections_list[electionCount - 1];

    res = await agent.get(`/createquestions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createquestions/${latestElection.id}`).send({
      questionname: "Monitoring",
      description: "players",
      _csrf: csrfToken,
    });

    res = await agent.get(`/createquestions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createquestions/${latestElection.id}`).send({
      question: "Best",
      description: "Fit",
      _csrf: csrfToken,
    });

    const groupedResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedquestionsGroupedResponse = JSON.parse(groupedResponse.text);
    const questionCount = parsedquestionsGroupedResponse.questions1.length;
    const latestQuestion =
      parsedquestionsGroupedResponse.questions1[questionCount - 1];

    res = await agent.get(`/questions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    const deleteResponse = await agent
      .delete(`/deletequestion/${latestQuestion.id}`)
      .send({
        _csrf: csrfToken,
      });
    console.log(deleteResponse.text);
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse.success).toBe(true);

    res = await agent.get(`/questions/${latestQuestion.id}`);
    csrfToken = extractCsrfToken(res);

    const deleteResponse2 = await agent
      .delete(`/deletequestion/${latestElection.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(parsedDeleteResponse2).toBe(false);
  });

  test("Update Your question", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");

    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "vote for teacher",
      publicurl: "url4",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/elections")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const electionCount = parsedGroupedResponse.elections_list.length;
    const latestElection =
      parsedGroupedResponse.elections_list[electionCount - 1];

    res = await agent.get(`/createquestions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createquestions/${latestElection.id}`).send({
      questionname: "Vote for teacher",
      description: "Select favourate faculty",
      _csrf: csrfToken,
    });

    const QuestionsResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedquestionGroupedResponse = JSON.parse(QuestionsResponse.text);
    const questionCount = parsedquestionGroupedResponse.questions1.length;
    const latestQuestion =
      parsedquestionGroupedResponse.questions1[questionCount - 1];

    res = await agent.get(
      `/elections/${latestElection.id}/questions/${latestQuestion.id}/edit`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .post(
        `/elections/${latestElection.id}/questions/${latestQuestion.id}/edit`
      )
      .send({
        _csrf: csrfToken,
        questionname: "SElect your Class",
        description: "3rd year",
      });
    expect(res.statusCode).toBe(302);
  });

  test("Adding option", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");

    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Election",
      publicurl: "url6",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/elections")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(ElectionsResponse.text);
    const electionCount = parsedGroupedResponse.elections_list.length;
    const latestElection =
      parsedGroupedResponse.elections_list[electionCount - 1];

    res = await agent.get(`/createquestions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createquestions/${latestElection.id}`).send({
      questionname: "First place",
      description: "who wins",
      _csrf: csrfToken,
    });

    const QuestionsResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedquestionsGroupedResponse = JSON.parse(QuestionsResponse.text);
    const questionCount = parsedquestionsGroupedResponse.questions1.length;
    const latestQuestion =
      parsedquestionsGroupedResponse.questions1[questionCount - 1];

    res = await agent.get(
      `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);

    res = await agent
      .post(
        `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .send({
        _csrf: csrfToken,
        optionname: "Option",
      });
    expect(res.statusCode).toBe(302);
  });

  test("Delete option", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "12345678");

    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "name",
      publicurl: "url7",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/elections")
      .set("Accept", "application/json");
    const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
    const electionCount = parsedElectionsResponse.elections_list.length;
    const latestElection =
      parsedElectionsResponse.elections_list[electionCount - 1];

    res = await agent.get(`/createquestions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createquestions/${latestElection.id}`).send({
      questionname: "Question",
      description: "Test",
      _csrf: csrfToken,
    });

    const QuestionsResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(QuestionsResponse.text);
    const questionCount = parsedGroupedResponse.questions1.length;
    const latestQuestion = parsedGroupedResponse.questions1[questionCount - 1];

    res = await agent.get(
      `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .post(
        `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .send({
        _csrf: csrfToken,
        optionname: "Done",
      });

    const OptionsResponse = await agent
      .get(
        `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .set("Accept", "application/json");
    const parsedoptionGroupedResponse = JSON.parse(OptionsResponse.text);
    console.log(parsedoptionGroupedResponse);
    const optionsCount = parsedoptionGroupedResponse.option.length;
    const latestOption = parsedoptionGroupedResponse.option[optionsCount - 1];

    res = await agent.get(
      `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    const deleteResponse = await agent
      .delete(`/${latestOption.id}/deleteoptions`)
      .send({
        _csrf: csrfToken,
      });
    const DeleteResponse = JSON.parse(deleteResponse.text).success;
    expect(DeleteResponse).toBe(true);

    res = await agent.get(
      `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    const deleteResponse2 = await agent
      .delete(`/${latestOption.id}/deleteoptions`)
      .send({
        _csrf: csrfToken,
      });
    const DeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(DeleteResponse2).toBe(false);
  });

  test("Updating option", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");

    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Vote",
      publicurl: "Vote-url7",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/elections")
      .set("Accept", "application/json");
    const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
    const electionCount = parsedElectionsResponse.elections_list.length;
    const latestElection =
      parsedElectionsResponse.elections_list[electionCount - 1];

    res = await agent.get(`/createquestions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createquestions/${latestElection.id}`).send({
      questionname: "LEADER",
      description: "Best",
      _csrf: csrfToken,
    });

    const QuestionsResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(QuestionsResponse.text);
    const questionCount = parsedGroupedResponse.questions1.length;
    const latestQuestion = parsedGroupedResponse.questions1[questionCount - 1];

    res = await agent.get(
      `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .post(
        `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .send({
        _csrf: csrfToken,
        optionname: "Husky",
      });

    const OptionsResponse = await agent
      .get(
        `/getelections/addoption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .set("Accept", "application/json");
    const parsedoptionGroupedResponse = JSON.parse(OptionsResponse.text);
    console.log(parsedoptionGroupedResponse);
    const optionsCount = parsedoptionGroupedResponse.option.length;
    const latestOption = parsedoptionGroupedResponse.option[optionsCount - 1];

    res = await agent.get(
      `/elections/${latestElection.id}/questions/${latestQuestion.id}/options/${latestOption.id}/edit`
    );
    csrfToken = extractCsrfToken(res);

    res = await agent
      .post(
        `/elections/${latestElection.id}/questions/${latestQuestion.id}/options/${latestOption.id}/edit`
      )
      .send({
        _csrf: csrfToken,
        optionname: "Jack",
      });
    expect(res.statusCode).toBe(302);
  });

  test("Adding New voter", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");

    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Vote-SPL",
      publicurl: "SPL-URL-9",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/elections")
      .set("Accept", "application/json");
    const parsedResponse = JSON.parse(groupedResponse.text);
    const electionCount = parsedResponse.elections_list.length;
    const latestElection = parsedResponse.elections_list[electionCount - 1];
    res = await agent.get(`/newvoter/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    let response = await agent.post(`/newvoter/${latestElection.id}`).send({
      voterid: "Rohit",
      password: "rohit@test.com",
      electionID: latestElection.id,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Preview election", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@test.com", "12345678");
    let res = await agent.get("/addquestion");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "HII",
      publicurl: "hi-url",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/elections")
      .set("Accept", "application/json");
    const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
    const electionCount = parsedElectionsResponse.elections_list.length;
    const latestElection =
      parsedElectionsResponse.elections_list[electionCount - 1];
    res = await agent.get(`/election/${latestElection.id}/previewelection`);
    csrfToken = extractCsrfToken(res);
    expect(res.statusCode).toBe(200);
  });
});