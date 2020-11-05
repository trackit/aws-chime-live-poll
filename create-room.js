const uuid = require('uuid')
const AWS = require('aws-sdk')
AWS.config.update({ region: 'us-west-1' })

exports.handler = async function (event, context, callback) {
    console.log('Event: \'' + event + '\'')
    if (event == null || !('body' in event) || !('region' in event.body)) {
        callback(null, {
            code: 200,
            response: {
                error: 'Excepted 1 (region) argument but found 0.'
            }
        })
        return
    }
    const db = new AWS.DynamoDB.DocumentClient()
    const chime = new AWS.Chime({ region: 'us-east-1' })
    chime.endpoint = new AWS.Endpoint('https://service.chime.aws.amazon.com')

    const meetingResponse = await chime.createMeeting({
        ClientRequestToken: uuid.v4(),
        MediaRegion: event.body.region
    }).promise()

    const data = {
        'room_id': uuid.v4(),
        'participant_id': uuid.v4()
    }

    console.log('Data:', data)
    console.log('Meeting response: ', meetingResponse)
    const attendeeResponse = await chime.createAttendee({
        MeetingId: meetingResponse.Meeting.MeetingId,
        ExternalUserId: data.participant_id
    }).promise()

    console.log('Attendee response: ', attendeeResponse)
    db.put({
        TableName: 'aws-chime-poll',
        Item: {
            'room_id': data.room_id.toString(),
            'participant_id': data.participant_id.toString(),
            'attendee': JSON.stringify(attendeeResponse.Attendee),
            'meeting': JSON.stringify(meetingResponse.Meeting)
        },
    }, function (err) {
        if (err == null) {
            callback(null, {
                code: 200,
                response: data
            })
        } else {
            callback(null, {
                code: 404,
                response: err.toString()
            })
        }
    })
}
