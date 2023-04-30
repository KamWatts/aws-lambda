/** @format */

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

describe("S3 Lambda function", () => {
  test("should get image manifest from S3 bucket", async () => {
    const event = {
      Records: [
        {
          s3: {
            bucket: {
              name: "my-bucket",
            },
            object: {
              key: "my-image.jpg",
              size: 1024,
            },
          },
        },
      ],
    };

    const s3Client = new S3Client({ region: "us-west-2" });
    const getObjectCommandMock = jest.fn().mockReturnValue({
      Body: JSON.stringify({ images: [] }),
    });
    s3Client.send = getObjectCommandMock;
    const response = await require("./aws-lambda/index")(event);

    expect(getObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "my-bucket",
      Key: "images.json",
    });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual('"This is Lambda from AWS"');
  });

  test("should create new manifest if it does not exist", async () => {
    const event = {
      Records: [
        {
          s3: {
            bucket: {
              name: "my-bucket",
            },
            object: {
              key: "my-image.jpg",
              size: 1024,
            },
          },
        },
      ],
    };
    const s3Client = new S3Client({ region: "us-west-2" });
    const getObjectCommandMock = jest.fn().mockRejectedValue({
      code: "NoSuchKey",
    });

    s3Client.send = getObjectCommandMock;
    const putObjectCommandMock = jest.fn().mockReturnValue({});
    s3Client.send = putObjectCommandMock;
    const response = await require("./aws-lambda/index")(event);

    expect(getObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "my-bucket",
      Key: "images.json",
    });
    expect(putObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "my-bucket",
      Key: "images.json",
    });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual('"This is Lambda from AWS"');
  });

  test("should log and return error if getting manifest fails", async () => {
    const event = {
      Records: [
        {
          s3: {
            bucket: {
              name: "my-bucket",
            },
            object: {
              key: "my-image.jpg",
              size: 1024,
            },
          },
        },
      ],
    };

    const s3Client = new S3Client({ region: "us-west-2" });
    const getObjectCommandMock = jest
      .fn()
      .mockRejectedValue(new Error("Unexpected error"));
    s3Client.send = getObjectCommandMock;
    const consoleLogMock = jest.spyOn(console, "log").mockImplementation();
    const response = await require("./aws-lambda/index")(event);

    expect(getObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "my-bucket",
      Key: "images.json",
    });
    expect(consoleLogMock).toHaveBeenCalledWith(new Error("Unexpected error"));
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual('"This is Lambda from AWS"');

    consoleLogMock.mockRestore();
  });
});
