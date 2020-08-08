const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const conn = new Sequelize('postgres://localhost/acme_db');
const chalk = require('chalk');

const Employee = conn.define('employee', {
  name: {
    type: STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  }
});

Employee.belongsTo(Employee, { as: 'manager'});
Employee.hasMany(Employee, { foreignKey: 'managerId', as: 'directReports' });


const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const [moe, lucy, larry, ethyl] = await Promise.all([
    Employee.create({ name: 'moe'}),
    Employee.create({ name: 'lucy'}),
    Employee.create({ name: 'larry'}),
    Employee.create({ name: 'ethyl'})
  ]);

  moe.managerId = lucy.id;
  larry.managerId = lucy.id;
  ethyl.managerId = lucy.id;
  await Promise.all([
    moe.save(),
    larry.save(),
    ethyl.save()
  ]);

};

Employee.clearManagers = function(){
  return this.update({ managerId: null }, { 
    where: {
      managerId: {
        [Sequelize.Op.ne]: null
      }
    }
  });
}

Employee.prototype.getColleagues = function(){
  return Employee.findAll({
    where: {
      managerId: this.managerId,
      id: {
        [Sequelize.Op.ne]: this.id
      }
    }
  });
}


const init = async()=> {
  try {
    await syncAndSeed();
    //await Employee.clearManagers();


    const employees = await Employee.findAll({
      include: [
        {
          model: Employee,
          as: 'manager'
        },
        {
          model: Employee,
          as: 'directReports'
        }
      ]
    });

    console.log(chalk.inverse('seeded employees'));
    employees.forEach((employee)=> {
      console.log('------');
      console.log(employee.name);
      console.log(employee.manager ? `reports to ${employee.manager.name}` : 'no manager');
      console.log(chalk.cyan('manages'));
      employee.directReports.forEach( employee => {
        console.log(employee.name);
      });
    });

    const moe = await Employee.findOne({ where: {
      name: 'moe'
    }});
    const colleagues = await moe.getColleagues();
    console.log(chalk.inverse('moes colleagues'));
    colleagues.forEach( employee => console.log(employee.name));
  }
  catch(ex){
    console.log(ex);
  }
};

init();
