import { Elysia, t } from "elysia";
import { createDb } from "./db";
import { faker } from "@faker-js/faker";
import { z } from "zod";

enum Hobbies {
  Dance = "Dance", 
  Karate =  "Karate", 
  Swimming = "Swimming"
}

const seniority = ["Junior", "Mid", "Senior"] as const;

const UserSchema = z.object({
  userName: z.string(),
  age: z.number().gt(0),
  birthday: z.date().optional(),
  isProgrammer: z.boolean().nullable(),
  hobby: z.nativeEnum(Hobbies),
  seniority: z.enum(seniority)
});

type User = z.infer<typeof UserSchema>;

const user: User = { 
  userName: "John Doe",
  age: 10,
  isProgrammer: null,
  hobby: Hobbies.Dance,
  seniority: "Mid"
}

console.log(UserSchema.parse(user), " ==== ");

console.log(UserSchema.safeParse(user).success, " ==== ");

const app = new Elysia()
  .decorate('db', createDb())

  .post("/seed", ({db}) => {
    const insertUserQuery = db.prepare(
      "INSERT INTO users (first_name, last_name, email, about) VALUES ($first_name, $last_name, $email, $about) RETURNING *"
    );

    for (let i = 0; i < 100; i ++) {
      insertUserQuery.run(
        {
          $first_name: faker.person.firstName(), 
          $last_name: faker.person.lastName(), 
          $email: faker.internet.email(), 
          $about: faker.lorem.text()
        }
      )
    }

    return "SEED done"}
  )

  .get("/", (context) => {
    console.log(context, " === context");
    
    return "Hello Elysia!!!"}
  )

  .get("/users",
    ({query, db}) => {
        return db.query("SELECT * FROM users order by first_name desc limit $limit")
            .all({
                $limit: query.limit
            })
    },
    {
        query: t.Object({
            limit: t.Numeric()
        })
    })



  // GET user BY ID
  .get("/users/:id", ({
    db, params
  }) => {
  
    console.log(`GET user by Id ${params.id}`);
    
   return db.query("SELECT * FROM users WHERE user_id = $user_id")
      .get({
        $user_id: params.id
      })
    
    }, {
      params: t.Object({
        id: t.Numeric()
      })
    }
  )
  
  // POST
  .post("/users", ({body, db}) => {
    console.log("Inserting user to the table")
    const insertUser = db.prepare(
        "INSERT INTO users (first_name, last_name, email, about) VALUES ($first_name, $last_name, $email, $about) RETURNING *");

    const insertedUser = insertUser.get({
        $first_name: body.first_name,
        $last_name: body.last_name,
        $email: body.email,
        $about: body.about || null
    })
    console.log(`Inserted user ${insertedUser}`)
    return insertedUser
  },
  {
    body: t.Object({
        first_name: t.String(),
        last_name: t.String(),
        email: t.String(),
        about: t.Optional(t.String())
    })
  })

  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
