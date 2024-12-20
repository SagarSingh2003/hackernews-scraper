// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
import { chromium } from "playwright";
import ora from 'ora';
import chalk from 'chalk';
import psp from 'prompt-sync-plus';
import { title } from "process";

const base_url = 'https://news.ycombinator.com/';

async function sortHackerNewsArticles() {

    const validator = new HackerNewsValidator()

    await validator.initialize()

    await validator.navigateToURL(base_url);

    const scrapingspinner = ora('Scraping News...').start()

    await validator.scrapeNArticles(100)

    scrapingspinner.succeed(`finished scraping ${validator.articles_age_list.length} news articles`);

    await validator.validateIsSortedNewestToOldest()

    await validator.closeBrowser()

    await validator.openMenu()
}



class HackerNewsValidator{
  
  constructor(){
  
    this.articles_age_list = [];
    
    this.article_count = 0;

    this.article_search_result = [];

    this.article_search_result_start_time = {};

    this.article_search_result_stop_time = {};

    this.article_search_result_duration = 0;

    this.final_validation_result = {
        start_time : new Date(Date.now()),
        stop_time: '',
        is_sorted : true,
        total_articles : this.articles_age_list.length,
        abnormal_articles : []
    }
  
  }

  async initialize (){
    

      const spinner = ora('Launching Chrome').start()

      try{

        
          this.browser = await chromium.launch({headless : false , slowMo : 200})
        
          this.newContext = await this.browser.newContext()
        
          this.page = await this.newContext.newPage()

        
      }catch(err){

        console.error(err);

        spinner.fail('error encountered')

      }finally{

        spinner.succeed('Chrome launched!')

      }

  }


  async navigateToURL(URL){

      try{
        
        this.page_contents = await this.page.goto(base_url);
      
      }catch(err){
      
        console.error(err);
      
      }


  }

  async scrapeNArticles(n){
      

      try{


          await this.page.waitForSelector('.athing')

          const articles = await this.page.evaluate(async () => {

              const rows = document.getElementsByClassName('athing')

              const articleData = await Promise.all(Object.keys(rows).map(async (row) => {
                  
                  const parent_title_obj = rows[row].querySelectorAll('.titleline>a')
                  
                  const title = parent_title_obj[0].innerHTML;

                  const desc = rows[row].nextElementSibling;

                  const time = desc.querySelectorAll('.age')[0].title;
                  

                  const articleData = {
                      time : time,
                      title : title 
                  }

                  return articleData;
              }));
              
              return articleData  
              
          })
          

          articles.forEach((article) => {
              
              if(this.articles_age_list.length < n){
                  this.articles_age_list.push({id : ++this.article_count , ...article})
              }

          })

          if(this.articles_age_list.length < n){

            await this.page.locator(".morelink").click();
            await this.page.waitForLoadState();
            await this.scrapeNArticles(n);

            return;
          }else{
                
            return;
          }
          
      }catch(err){

        console.error(err);

      }
  }

  async #searchForX(user_input_title){

        
    
        try{

            await this.page.waitForSelector('.athing')

            const articles = await this.page.evaluate(async (user_input_title) => {

                const rows = document.getElementsByClassName('athing')

                // const articleData = await Promise.all(Object.keys(rows).map(async (row) => {
                const articleData = [];

                for(let row in Object.keys(rows)){
                    
                    const parent_title_obj = rows[row].querySelectorAll('.titleline>a')
                    
                    const title = parent_title_obj[0].innerHTML;

                    const href = parent_title_obj[0].getAttribute('href')

                    if(title?.toLowerCase().includes(user_input_title?.toLowerCase())){
                        
                        const desc = rows[row].nextElementSibling;

                        const time = desc.querySelectorAll('.age')[0].title;
                        
                        const data = {
                            url : href,
                            time : time,
                            title : title 
                        }

                        articleData.push(data);
                    }

                }
                // }));
                
                return articleData  
                
            } , user_input_title)
            


            if(articles?.length !== 0){
                articles.forEach(article => {
                    this.article_search_result.push(article)
                })
            }

            const currentTimeStamp = new Date(Date.now())
            const moreArticlesPresent = await this.page.locator(".morelink").isVisible();
            
            if((currentTimeStamp - this.article_search_result_start_time  < this.article_search_result_duration * 1000) && moreArticlesPresent){
                
                await this.page.locator(".morelink").click();
                await this.page.waitForLoadState();
                await this.#searchForX(user_input_title);

                return;

            }else{

                this.article_search_result_stop_time = currentTimeStamp;
            }
            


        }catch(err){

        console.error(err);

        }

  }

  async #extractMilisecondsFromTimeArr(arr){

      const epochArr = arr.map((article) => {
          const get_date_epoch_time_regex = /[0-9]{9,}/g
          let epochTimeArr = get_date_epoch_time_regex.exec(article.time);
          
          return Number(epochTimeArr[0]);
      })

      return epochArr;

  }

  async validateIsSortedNewestToOldest(){
      
      const epochArr = await this.#extractMilisecondsFromTimeArr(this.articles_age_list);

      for(let i = 0 ; i < epochArr.length -1 ;i++){
          if(epochArr[i] < epochArr[i + 1]){
              this.final_validation_result.is_sorted = false;
              this.final_validation_result.abnormal_articles.push(this.articles_age_list[i])
          }
      }

      this.final_validation_result.stop_time = new Date(Date.now())
  }

  async closeBrowser(){

      try{

          const spinner = ora('Closing Browser...').start()
          await this.browser.close()
          spinner.succeed('Closed Browser Successfully')

      }catch(err){
          
          console.error(err);

      }
  }

  async openMenu(){

      let user_input;
      while(user_input !== String(5)){

        const prompt = psp();
        
        console.log(chalk.green('• Enter 1 for displaying all the articles information'))

        console.log(chalk.cyan('• Enter 2 for checking if the articles are sorted'))

        console.log(chalk.cyan('• Enter 3 for displaying the final report'))
        
        console.log(chalk.cyan('• Enter 4 for searching any article in the news feed'))

        console.log(chalk.red('• Enter 5 for closing the program'))
        
        user_input = prompt('');

        if(user_input === String(1)){
            console.log(chalk.yellow("here is the list of all the article data : \n"));
            console.table(this.articles_age_list);
        }else if(user_input === String(2)){

            if(this.final_validation_result.is_sorted){

                console.log(chalk.greenBright("**************************************************"))
                console.log(chalk.greenBright("yes the articles are sorted from newest to oldest!"))
                console.log(chalk.greenBright("**************************************************"))
            }else{

                console.log(chalk.red("******************************************************"))
                console.log(chalk.red("no the articles are not sorted from newest to oldest!"))
                console.log(chalk.red("******************************************************"))
            }

        }else if(user_input === String(3)){

            console.table(({"Total No of articles" : this.article_count , " is article sorted from newest to oldest " : this.final_validation_result.is_sorted }))
            
            console.log("List of anomaly articles")
            
            console.table(this.final_validation_result.abnormal_articles)

            console.log(chalk.yellowBright(`starting time : ${this.final_validation_result.start_time}`))
            
            console.log(chalk.yellowBright(`stopping time : ${this.final_validation_result.stop_time}`))


            console.log(chalk.yellowBright(`duration of operation: ${this.final_validation_result.stop_time - this.final_validation_result.start_time} ms`))
    
        }else if(user_input === String(4)){
		
		this.article_search_result = [];
		
                const prompt = psp();

                const user_input_title = prompt(chalk.cyan("Enter a title \n"))

                const search_duration = Number(prompt(chalk.yellowBright('Enter the duration of the search in seconds \n')))

                await this.initialize()

                await this.navigateToURL(base_url)

                
                const spinner = ora('Searching').start()

                this.article_search_result_duration = search_duration

                this.article_search_result_start_time = new Date(Date.now())

                await this.#searchForX(user_input_title)
                
                spinner.succeed('Search Operation Finished')

                const duration_in_miliseconds = this.article_search_result_stop_time - this.article_search_result_start_time 

                console.log(chalk.greenBright(`operation started at : ${this.article_search_result_start_time}`))

                console.log(chalk.greenBright(`operation finished at : ${this.article_search_result_stop_time}`))

                console.log(chalk.cyanBright(`Duration of search : ${duration_in_miliseconds} ms` ))

                console.log(chalk.greenBright("Search Reuslts :"))

                console.table(this.article_search_result)

                await this.closeBrowser()
        }

      }

  }
}


(async () => {
  await sortHackerNewsArticles();
})();
